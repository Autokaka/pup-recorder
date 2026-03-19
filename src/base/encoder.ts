// Created by Autokaka (qq1909698494@gmail.com) on 2026/03/14.

import type { AudioEncoderConfig, VideoEncoderConfig } from "@napi-rs/webcodecs";
import { AudioData, AudioEncoder, VideoEncoder, VideoFrame } from "@napi-rs/webcodecs";
import { join } from "path";
import type { VideoFormat } from "../renderer/schema";
import { BgraConverter } from "../rust/lib";
import { createMovMuxer, createMp4Muxer } from "./muxer/hevc_isobmff_muxer";
import type { MediaMuxer, MuxerOptions } from "./muxer/media_muxer";
import { WebMMuxer } from "./muxer/vp9_webm_muxer";

type VideoProfile = Pick<VideoEncoderConfig, "codec" | "bitrate" | "alpha" | "hardwareAcceleration" | "latencyMode">;
type AudioProfile = Pick<AudioEncoderConfig, "codec" | "bitrate">;

interface FormatProfile {
  video: VideoProfile;
  audio: AudioProfile;
  createMuxer: (opts: MuxerOptions) => MediaMuxer;
}

interface FormatEntry {
  muxer: MediaMuxer;
  audioEncoder?: AudioEncoder;
  audioTs: number;
}

export interface EncoderPipelineOptions {
  width: number;
  height: number;
  fps: number;
  formats: VideoFormat[];
  outDir: string;
  withAudio?: boolean;
}

const HEVC: VideoProfile = {
  codec: "hvc1.2.6.L120.B0",
  bitrate: 8_000_000,
  alpha: "keep",
  hardwareAcceleration: "prefer-software",
  latencyMode: "realtime",
};

const FORMAT_PROFILES: Record<VideoFormat, FormatProfile> = {
  mp4: { video: HEVC, audio: { codec: "mp4a.40.2", bitrate: 128_000 }, createMuxer: createMp4Muxer },
  mov: { video: HEVC, audio: { codec: "mp4a.40.2", bitrate: 128_000 }, createMuxer: createMovMuxer },
  webm: {
    video: { codec: "vp09.00.31.08", bitrate: 8_000_000, alpha: "keep", latencyMode: "realtime" },
    audio: { codec: "opus", bitrate: 128_000 },
    createMuxer: (opts) => new WebMMuxer(opts),
  },
};

export class EncoderPipeline {
  private readonly _entries = new Map<VideoFormat, FormatEntry>();
  private readonly _encoders: VideoEncoder[] = [];
  private readonly _converter: BgraConverter;
  private readonly _width: number;
  private readonly _height: number;
  private readonly _fps: number;
  private _frameIndex = 0;
  private _sampleRate = 0;

  constructor({ width, height, fps, formats, outDir, withAudio }: EncoderPipelineOptions) {
    this._width = width;
    this._height = height;
    this._fps = fps;
    this._converter = new BgraConverter(width, height, 4);

    const muxerOpts = (format: VideoFormat): MuxerOptions => ({
      width,
      height,
      fps,
      outPath: join(outDir, `output.${format}`),
      withAudio,
    });

    // mp4 + mov share one HEVC encoder and fan out to both muxers.
    const hevcFormats = formats.filter((f) => f === "mp4" || f === "mov");
    if (hevcFormats.length > 0) {
      const muxers = hevcFormats.map((f) => FORMAT_PROFILES[f].createMuxer(muxerOpts(f)));
      hevcFormats.forEach((f, i) => this._entries.set(f, { muxer: muxers[i]!, audioTs: 0 }));
      const enc = new VideoEncoder({
        output: (chunk, meta) => muxers.forEach((m) => m.addVideoChunk(chunk, meta ?? undefined)),
        error: (e) => console.error("[hevc]", e),
      });
      enc.configure({ ...HEVC, width, height, framerate: fps });
      this._encoders.push(enc);
    }

    for (const f of formats.filter((f) => f === "webm")) {
      const muxer = FORMAT_PROFILES[f].createMuxer(muxerOpts(f));
      this._entries.set(f, { muxer, audioTs: 0 });
      const enc = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta ?? undefined),
        error: (e) => console.error("[vp9]", e),
      });
      enc.configure({ ...FORMAT_PROFILES.webm.video, width, height, framerate: fps });
      this._encoders.push(enc);
    }
  }

  setupAudio(sampleRate: number): void {
    this._sampleRate = sampleRate;
    for (const [format, entry] of this._entries) {
      const { audio } = FORMAT_PROFILES[format];
      const audioEncoder = new AudioEncoder({
        output: (chunk, meta) => entry.muxer.addAudioChunk(chunk, meta ?? undefined),
        error: (e) => console.error(`[${format} audio]`, e),
      });
      audioEncoder.configure({ ...audio, sampleRate, numberOfChannels: 2 });
      entry.audioEncoder = audioEncoder;
    }
  }

  async encodeFrame(bgra: Buffer, timestampUs: number): Promise<void> {
    const { _width: width, _height: height, _fps: fps } = this;
    const i420ap10 = await this._converter.convert(bgra);
    const isKeyFrame = this._frameIndex % fps === 0;
    this._frameIndex++;

    for (const enc of this._encoders) {
      const frame = new VideoFrame(i420ap10, {
        format: "I420AP10",
        codedWidth: width,
        codedHeight: height,
        timestamp: timestampUs,
        duration: Math.round(1_000_000 / fps),
      });
      enc.encode(frame, { keyFrame: isKeyFrame });
      frame.close();
    }
  }

  encodeAudio(pcm: Buffer): void {
    const { _sampleRate: sampleRate } = this;
    const data = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.byteLength / 4);
    const numberOfFrames = data.length / 2;

    for (const entry of this._entries.values()) {
      const { audioEncoder } = entry;
      if (!audioEncoder) continue;
      const audioData = new AudioData({
        format: "f32",
        sampleRate,
        numberOfChannels: 2,
        numberOfFrames,
        timestamp: entry.audioTs,
        data,
      });
      audioEncoder.encode(audioData);
      audioData.close();
      entry.audioTs += Math.round((numberOfFrames / sampleRate) * 1_000_000);
    }
  }

  async flush(): Promise<void> {
    const entries = [...this._entries.values()];
    await Promise.all([
      ...this._encoders.map((e) => e.flush()),
      ...entries.flatMap(({ audioEncoder }) => (audioEncoder ? [audioEncoder.flush()] : [])),
    ]);
    for (const enc of this._encoders) enc.close();
    for (const { audioEncoder } of entries) audioEncoder?.close();
  }

  async finalize(): Promise<Partial<Record<VideoFormat, string>>> {
    const result: Partial<Record<VideoFormat, string>> = {};
    await Promise.all(
      [...this._entries.entries()].map(async ([format, { muxer }]) => {
        result[format] = await muxer.finalize();
      }),
    );
    return result;
  }
}
