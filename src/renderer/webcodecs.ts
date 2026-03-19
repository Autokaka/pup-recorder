// Created by Autokaka (qq1909698494@gmail.com) on 2026/03/14.

import type { AudioEncoderConfig, VideoEncoderConfig } from "@napi-rs/webcodecs";
import { AudioData, AudioEncoder, VideoEncoder, VideoFrame } from "@napi-rs/webcodecs";
import { writeFile } from "fs/promises";
import { join } from "path";
import { HEVCMovMuxer, HEVCMp4Muxer } from "../base/muxer/hevc_isobmff_muxer";
import type { MediaMuxer } from "../base/muxer/media_muxer";
import { Vp9WebMMuxer } from "../base/muxer/vp9_webm_muxer";
import { BgraConverter } from "../rust/lib";
import type { VideoFormat } from "./schema";

interface VideoEncoderProfile extends Pick<
  VideoEncoderConfig,
  "codec" | "bitrate" | "alpha" | "hardwareAcceleration" | "latencyMode"
> {}

interface AudioEncoderProfile extends Pick<AudioEncoderConfig, "codec" | "bitrate"> {}

interface FormatProfile {
  video: VideoEncoderProfile;
  audio: AudioEncoderProfile;
  createMuxer: (width: number, height: number) => MediaMuxer;
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
}

const FORMAT_PROFILES: Record<VideoFormat, FormatProfile> = {
  mp4: {
    video: {
      codec: "hvc1.2.6.L120.B0",
      bitrate: 8_000_000,
      alpha: "keep",
      hardwareAcceleration: "prefer-software",
      latencyMode: "realtime",
    },
    audio: { codec: "mp4a.40.2", bitrate: 128_000 },
    createMuxer: (w, h) => new HEVCMp4Muxer(w, h),
  },
  mov: {
    video: {
      codec: "hvc1.2.6.L120.B0",
      bitrate: 8_000_000,
      alpha: "keep",
      hardwareAcceleration: "prefer-software",
      latencyMode: "realtime",
    },
    audio: { codec: "mp4a.40.2", bitrate: 128_000 },
    createMuxer: (w, h) => new HEVCMovMuxer(w, h),
  },
  webm: {
    video: { codec: "vp09.00.31.08", bitrate: 8_000_000, alpha: "keep", latencyMode: "quality" },
    audio: { codec: "opus", bitrate: 128_000 },
    createMuxer: (w, h) => new Vp9WebMMuxer(w, h),
  },
};

export class EncoderPipeline {
  private readonly _width: number;
  private readonly _height: number;
  private readonly _fps: number;
  private readonly _entries = new Map<VideoFormat, PipelineEntry>();
  private readonly _converter: InstanceType<typeof BgraConverter>;
  private _frameIndex = 0;

  constructor({ width, height, fps, formats }: EncoderPipelineOptions) {
    this._width = width;
    this._height = height;
    this._fps = fps;
    this._converter = new BgraConverter(width, height);

    for (const format of formats) {
      const profile = FORMAT_PROFILES[format];
      const muxer = profile.createMuxer(width, height);
      const videoEncoder = new VideoEncoder({
        // WebCodecs passes null for meta when there's no config; coerce to undefined to match MediaMuxer
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
    const flushAll = [...this._entries.values()].flatMap(({ videoEncoder, audioEncoder }) =>
      audioEncoder ? [videoEncoder.flush(), audioEncoder.flush()] : [videoEncoder.flush()],
    );
    await Promise.all(flushAll);
    for (const { videoEncoder, audioEncoder } of this._entries.values()) {
      videoEncoder.close();
      audioEncoder?.close();
    }
  }

  async finalize(outDir: string): Promise<Partial<Record<VideoFormat, string>>> {
    const result: Partial<Record<VideoFormat, string>> = {};
    await Promise.all(
      [...this._entries.entries()].map(async ([format, entry]) => {
        const data = await entry.muxer.finalize();
        const filePath = join(outDir, `output.${format}`);
        await writeFile(filePath, data);
        result[format] = filePath;
      }),
    );
    return result;
  }
}
