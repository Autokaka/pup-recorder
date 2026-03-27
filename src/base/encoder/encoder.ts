// Created by Autokaka (qq1909698494@gmail.com) on 2026/03/21.

import { FFmpegError, Frame, SoftwareScaleContext } from "node-av";
import {
  AV_PIX_FMT_BGRA,
  AV_PIX_FMT_YUVA420P,
  AV_SAMPLE_FMT_FLT,
  AV_SAMPLE_FMT_FLTP,
  FF_ENCODER_AAC,
  FF_ENCODER_LIBX265,
  SWS_BILINEAR,
  type FFAudioEncoder,
  type FFVideoEncoder,
} from "node-av/constants";

import { ConcurrencyLimiter } from "../limiter";
import { AudioEncoder } from "./audio";
import { FormatMuxer } from "./muxer";
import { VideoEncoder } from "./video";

interface FormatSpec {
  videoCodecName: FFVideoEncoder;
  codecTag?: string;
  globalHeader: boolean;
  videoOpts: Record<string, string>;
  audioCodecName: FFAudioEncoder;
  audioSampleFmt: typeof AV_SAMPLE_FMT_FLT | typeof AV_SAMPLE_FMT_FLTP;
  outSampleRate: number;
}

const MP4_SPEC: FormatSpec = {
  videoCodecName: FF_ENCODER_LIBX265,
  codecTag: "hvc1",
  globalHeader: true,
  videoOpts: { preset: "ultrafast", "x265-params": "log-level=1" },
  audioCodecName: FF_ENCODER_AAC,
  audioSampleFmt: AV_SAMPLE_FMT_FLTP,
  outSampleRate: 44_100,
};

interface FormatState {
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
  outFile: string;
  withAudio?: boolean;
  videoBitrate?: number;
  audioBitrate?: number;
}

export class EncoderPipeline {
  private readonly _state: FormatState;
  private readonly _sws: SoftwareScaleContext;
  private readonly _srcFrame: Frame;
  private readonly _yuvaFrame: Frame;
  private _disposed = false;

  private constructor(state: FormatState, sws: SoftwareScaleContext, srcFrame: Frame, yuvaFrame: Frame) {
    this._state = state;
    this._sws = sws;
    this._srcFrame = srcFrame;
    this._yuvaFrame = yuvaFrame;
  }

  static async create({
    width,
    height,
    fps,
    outFile,
    withAudio = false,
    videoBitrate = 8_000_000,
    audioBitrate = 128_000,
  }: EncoderPipelineOptions): Promise<EncoderPipeline> {
    const outPath = outFile;
    const muxer = new FormatMuxer(outPath);

    const video = await VideoEncoder.create({
      width,
      height,
      fps,
      codecName: MP4_SPEC.videoCodecName,
      codecTag: MP4_SPEC.codecTag,
      globalHeader: MP4_SPEC.globalHeader,
      codecOpts: MP4_SPEC.videoOpts,
      bitrate: videoBitrate,
      muxer,
    });

    let audio: AudioEncoder | undefined;
    if (withAudio) {
      audio = await AudioEncoder.create({
        outSampleRate: MP4_SPEC.outSampleRate,
        outSampleFmt: MP4_SPEC.audioSampleFmt,
        codecName: MP4_SPEC.audioCodecName,
        globalHeader: MP4_SPEC.globalHeader,
        bitrate: audioBitrate,
        muxer,
      });
    }

    await muxer.open();
    const state: FormatState = { outPath, muxer, video, audio, limiter: new ConcurrencyLimiter(1) };

    const sws = new SoftwareScaleContext();
    sws.getContext(width, height, AV_PIX_FMT_BGRA, width, height, AV_PIX_FMT_YUVA420P, SWS_BILINEAR);

    const srcFrame = new Frame();
    srcFrame.alloc();
    srcFrame.format = AV_PIX_FMT_BGRA;
    srcFrame.width = width;
    srcFrame.height = height;
    FFmpegError.throwIfError(srcFrame.getBuffer(0), "srcFrame.getBuffer");

    const yuvaFrame = new Frame();
    yuvaFrame.alloc();
    yuvaFrame.format = AV_PIX_FMT_YUVA420P;
    yuvaFrame.width = width;
    yuvaFrame.height = height;
    FFmpegError.throwIfError(yuvaFrame.getBuffer(0), "yuvaFrame.getBuffer");

    return new EncoderPipeline(state, sws, srcFrame, yuvaFrame);
  }

  setupAudio(sampleRate: number): void {
    this._state.audio?.setInputRate(sampleRate);
  }

  async encodeFrame(input: Buffer | Frame): Promise<void> {
    let yuva: Frame;

    if (input instanceof Frame) {
      yuva = input;
    } else {
      FFmpegError.throwIfError(this._srcFrame.makeWritable(), "srcFrame.makeWritable");
      FFmpegError.throwIfError(this._srcFrame.fromBuffer(input), "srcFrame.fromBuffer");
      FFmpegError.throwIfError(await this._sws.scaleFrame(this._yuvaFrame, this._srcFrame), "sws.scaleFrame");
      yuva = this._yuvaFrame;
    }

    const s = this._state;
    await s.limiter.schedule(() => {
      FFmpegError.throwIfError(yuva.makeWritable(), "yuvaFrame.makeWritable");
      return s.video.encode(yuva, s.muxer);
    });
  }

  async encodeAudio(pcm: Buffer): Promise<void> {
    const s = this._state;
    if (s.audio) await s.limiter.schedule(() => s.audio!.encode(pcm, s.muxer));
  }

  async finish(): Promise<string> {
    const s = this._state;
    try {
      await using _m = s.muxer;
      using _v = s.video;
      using _a = s.audio;
      await s.limiter.end();
      await s.audio?.flush(s.muxer);
      await s.video.flush(s.muxer);
    } finally {
      this.freeShared();
    }
    return s.outPath;
  }

  async [Symbol.asyncDispose](): Promise<void> {
    if (this._disposed) return;
    const s = this._state;
    s.limiter.end().catch(() => {});
    s.video[Symbol.dispose]();
    s.audio?.[Symbol.dispose]();
    await s.muxer[Symbol.asyncDispose]().catch(() => {});
    this.freeShared();
  }

  private freeShared(): void {
    if (this._disposed) return;
    this._disposed = true;
    this._srcFrame.free();
    this._yuvaFrame.free();
    this._sws[Symbol.dispose]();
  }
}
