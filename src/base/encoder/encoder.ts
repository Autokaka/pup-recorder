// Created by Autokaka (qq1909698494@gmail.com) on 2026/03/21.

import { Log } from "node-av";
import {
  AV_LOG_ERROR,
  AV_LOG_WARNING,
  AV_PIX_FMT_YUVA420P,
  AV_SAMPLE_FMT_FLT,
  AV_SAMPLE_FMT_FLTP,
  FF_ENCODER_AAC,
  FF_ENCODER_LIBX265,
  type FFAudioEncoder,
  type FFVideoEncoder,
} from "node-av/constants";
import { join } from "path";

import type { VideoFormat } from "../../renderer/schema";
import { ConcurrencyLimiter } from "../limiter";
import { logger } from "../logging";
import { AudioEncoder } from "./audio";
import { FormatMuxer } from "./muxer";
import { VideoEncoder } from "./video";

Log.setCallback((level, message) => {
  const msg = message.trimEnd();
  if (!msg) return;
  if (level <= AV_LOG_ERROR) logger.error(msg);
  else if (level <= AV_LOG_WARNING) logger.warn(msg);
});

interface FormatSpec {
  videoCodecName: FFVideoEncoder;
  pixFmt: typeof AV_PIX_FMT_YUVA420P;
  codecTag?: string;
  globalHeader: boolean;
  videoOpts: Record<string, string>;
  audioCodecName: FFAudioEncoder;
  audioSampleFmt: typeof AV_SAMPLE_FMT_FLT | typeof AV_SAMPLE_FMT_FLTP;
  outSampleRate: number;
}

const FORMAT_SPECS: Record<VideoFormat, FormatSpec> = {
  mp4: {
    videoCodecName: FF_ENCODER_LIBX265,
    pixFmt: AV_PIX_FMT_YUVA420P,
    codecTag: "hvc1",
    globalHeader: true,
    videoOpts: { preset: "ultrafast", "x265-params": "log-level=1" },
    audioCodecName: FF_ENCODER_AAC,
    audioSampleFmt: AV_SAMPLE_FMT_FLTP,
    outSampleRate: 44_100,
  },
  webm: {
    videoCodecName: "libvpx-vp9" as FFVideoEncoder,
    pixFmt: AV_PIX_FMT_YUVA420P,
    globalHeader: false,
    videoOpts: { quality: "realtime", "cpu-used": "8" },
    audioCodecName: "libopus" as FFAudioEncoder,
    audioSampleFmt: AV_SAMPLE_FMT_FLT,
    outSampleRate: 48_000,
  },
};

interface FormatState {
  format: VideoFormat;
  outPath: string;
  muxer: FormatMuxer;
  video: VideoEncoder;
  audio?: AudioEncoder;
  limiter: ConcurrencyLimiter;
}

export interface EncoderPipelineOptions {
  width: number;
  height: number;
  fps: number;
  formats: VideoFormat[];
  outDir: string;
  withAudio?: boolean;
  videoBitrate?: number;
  audioBitrate?: number;
}

export type EncoderResult = Partial<Record<VideoFormat, string>>;

export class EncoderPipeline {
  private readonly _states: FormatState[];

  private constructor(states: FormatState[]) {
    this._states = states;
  }

  static async create({
    width,
    height,
    fps,
    formats,
    outDir,
    withAudio = false,
    videoBitrate = 8_000_000,
    audioBitrate = 128_000,
  }: EncoderPipelineOptions): Promise<EncoderPipeline> {
    const states = await Promise.all(
      formats.map(async (format) => {
        const spec = FORMAT_SPECS[format];
        const outPath = join(outDir, `output.${format}`);
        const muxer = new FormatMuxer(outPath);

        const video = await VideoEncoder.create({
          width,
          height,
          fps,
          codecName: spec.videoCodecName,
          pixFmt: spec.pixFmt,
          codecTag: spec.codecTag,
          globalHeader: spec.globalHeader,
          codecOpts: spec.videoOpts,
          bitrate: videoBitrate,
          muxer,
        });

        let audio: AudioEncoder | undefined;
        if (withAudio) {
          audio = await AudioEncoder.create({
            outSampleRate: spec.outSampleRate,
            outSampleFmt: spec.audioSampleFmt,
            codecName: spec.audioCodecName,
            globalHeader: spec.globalHeader,
            bitrate: audioBitrate,
            muxer,
          });
        }

        await muxer.open();
        const limiter = new ConcurrencyLimiter(1);
        return { format, outPath, muxer, video, audio, limiter } satisfies FormatState;
      }),
    );
    return new EncoderPipeline(states);
  }

  setupAudio(sampleRate: number): void {
    for (const s of this._states) {
      s.audio?.setInputRate(sampleRate);
    }
  }

  async encodeFrame(bgra: Buffer, _timestampUs: number): Promise<void> {
    await Promise.all(this._states.map((s) => s.limiter.schedule(() => s.video.encode(bgra, s.muxer))));
  }

  async encodeAudio(pcm: Buffer): Promise<void> {
    await Promise.all(
      this._states.map((s) => {
        if (!s.audio) return Promise.resolve();
        return s.limiter.schedule(() => s.audio!.encode(pcm, s.muxer));
      }),
    );
  }

  async finish(): Promise<EncoderResult> {
    const result: EncoderResult = {};
    await Promise.all(
      this._states.map(async (s) => {
        await s.limiter.end();
        await s.audio?.flush(s.muxer);
        await s.video.flush(s.muxer);
        result[s.format] = s.outPath;
        using _a = s.audio;
        using _v = s.video;
        await using _m = s.muxer;
      }),
    );
    return result;
  }
}
