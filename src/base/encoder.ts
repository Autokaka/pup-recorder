// Created by Autokaka (qq1909698494@gmail.com) on 2026/03/14.

import type { AudioEncoderConfig, VideoEncoderConfig } from "@napi-rs/webcodecs";
import { AudioData, AudioEncoder, VideoEncoder, VideoFrame } from "@napi-rs/webcodecs";
import { join } from "path";
import type { VideoFormat } from "../renderer/schema";
import { BgraConverter } from "../rust/lib";
import { createMovMuxer, createMp4Muxer } from "./muxer/hevc_isobmff_muxer";
import type { MediaMuxer, MuxerOptions } from "./muxer/media_muxer";
import { Vp9WebMMuxer } from "./muxer/vp9_webm_muxer";

type VideoProfile = Pick<VideoEncoderConfig, "codec" | "bitrate" | "alpha" | "hardwareAcceleration" | "latencyMode">;
type AudioProfile = Pick<AudioEncoderConfig, "codec" | "bitrate">;

interface FormatProfile {
  video: VideoProfile;
  audio: AudioProfile;
  createMuxer: (opts: MuxerOptions) => MediaMuxer;
}

interface PipelineEntry {
  videoEncoder: VideoEncoder;
  muxer: MediaMuxer;
  audioEncoder?: AudioEncoder;
  audioTimestampUs: number;
}

export interface EncoderPipelineOptions {
  width: number;
  height: number;
  fps: number;
  formats: VideoFormat[];
  outDir: string;
}

const HEVC_VIDEO: VideoProfile = {
  codec: "hvc1.2.6.L120.B0",
  bitrate: 8_000_000,
  alpha: "keep",
  hardwareAcceleration: "prefer-software",
  latencyMode: "realtime",
};

const FORMAT_PROFILES: Record<VideoFormat, FormatProfile> = {
  mp4: {
    video: HEVC_VIDEO,
    audio: { codec: "mp4a.40.2", bitrate: 128_000 },
    createMuxer: createMp4Muxer,
  },
  mov: {
    video: HEVC_VIDEO,
    audio: { codec: "mp4a.40.2", bitrate: 128_000 },
    createMuxer: createMovMuxer,
  },
  webm: {
    video: { codec: "vp09.00.31.08", bitrate: 8_000_000, alpha: "keep", latencyMode: "realtime" },
    audio: { codec: "opus", bitrate: 128_000 },
    createMuxer: (opts) => new Vp9WebMMuxer(opts),
  },
};

export class EncoderPipeline {
  private readonly _width: number;
  private readonly _height: number;
  private readonly _fps: number;
  private readonly _entries = new Map<VideoFormat, PipelineEntry>();
  private readonly _converter: BgraConverter;
  private _frameIndex = 0;

  constructor({ width, height, fps, formats, outDir }: EncoderPipelineOptions) {
    this._width = width;
    this._height = height;
    this._fps = fps;
    this._converter = new BgraConverter(width, height, 4);

    for (const format of formats) {
      const profile = FORMAT_PROFILES[format];
      const muxer = profile.createMuxer({ width, height, fps, outPath: join(outDir, `output.${format}`) });
      const videoEncoder = new VideoEncoder({
        output: (chunk, meta) => muxer.addVideoChunk(chunk, meta ?? undefined),
        error: (e) => console.error(`[${format} video encoder]`, e),
      });
      videoEncoder.configure({ ...profile.video, width, height, framerate: fps });
      this._entries.set(format, { videoEncoder, muxer, audioTimestampUs: 0 });
    }
  }

  setupAudio(sampleRate: number): void {
    for (const [format, entry] of this._entries) {
      const profile = FORMAT_PROFILES[format];
      const audioEncoder = new AudioEncoder({
        output: (chunk, meta) => entry.muxer.addAudioChunk(chunk, meta ?? undefined),
        error: (e) => console.error(`[${format} audio encoder]`, e),
      });
      audioEncoder.configure({ ...profile.audio, sampleRate, numberOfChannels: 2 });
      entry.audioEncoder = audioEncoder;
    }
  }

  async encodeFrame(bgraBuffer: Buffer, timestampUs: number): Promise<void> {
    const durationUs = Math.round(1_000_000 / this._fps);
    const i420ap10 = await this._converter.convert(bgraBuffer);
    const isKeyFrame = this._frameIndex % this._fps === 0;
    this._frameIndex++;

    for (const entry of this._entries.values()) {
      const frame = new VideoFrame(i420ap10, {
        format: "I420AP10",
        codedWidth: this._width,
        codedHeight: this._height,
        timestamp: timestampUs,
        duration: durationUs,
      });
      entry.videoEncoder.encode(frame, { keyFrame: isKeyFrame });
      frame.close();
    }
  }

  encodeAudio(interleavedFloat32Buffer: Buffer, sampleRate: number): void {
    const data = new Float32Array(
      interleavedFloat32Buffer.buffer,
      interleavedFloat32Buffer.byteOffset,
      interleavedFloat32Buffer.byteLength / 4,
    );
    const numberOfFrames = data.length / 2;

    for (const entry of this._entries.values()) {
      if (!entry.audioEncoder) continue;
      const audioData = new AudioData({
        format: "f32",
        sampleRate,
        numberOfChannels: 2,
        numberOfFrames,
        timestamp: entry.audioTimestampUs,
        data,
      });
      entry.audioEncoder.encode(audioData);
      audioData.close();
      entry.audioTimestampUs += Math.round((numberOfFrames / sampleRate) * 1_000_000);
    }
  }

  async flush(): Promise<void> {
    const entries = [...this._entries.values()];
    await Promise.all(
      entries.flatMap(({ videoEncoder, audioEncoder }) => {
        const promises: Promise<void>[] = [videoEncoder.flush()];
        if (audioEncoder) promises.push(audioEncoder.flush());
        return promises;
      }),
    );
    for (const { videoEncoder, audioEncoder } of entries) {
      videoEncoder.close();
      audioEncoder?.close();
    }
  }

  async finalize(): Promise<Partial<Record<VideoFormat, string>>> {
    const result: Partial<Record<VideoFormat, string>> = {};
    await Promise.all(
      [...this._entries.entries()].map(async ([format, entry]) => {
        result[format] = await entry.muxer.finalize();
      }),
    );
    return result;
  }
}
