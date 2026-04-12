// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/01.

import { FFmpegError, Frame } from "node-av";
import type { HardwareContext } from "node-av/api";
import { AV_PIX_FMT_BGRA, AV_SAMPLE_FMT_FLTP, FF_ENCODER_AAC } from "node-av/constants";

import { ok } from "assert";
import { ConcurrencyLimiter } from "../limiter";
import { AudioEncoder } from "./audio";
import { CodecState } from "./codec";
import { createVideoEncoder, type HwEncoder } from "./factory";
import { FormatMuxer } from "./muxer";
import { makeFrame } from "./shared";
import { VideoEncoder } from "./video";

export interface EncoderPipelineOptions {
  width: number;
  height: number;
  fps: number;
  outFile: string;
  withAudio?: boolean;
  disableGpu?: boolean;
}

interface PipelineState {
  video?: VideoEncoder;
  hwVideo?: HwEncoder;
  audio?: AudioEncoder;
  muxer: FormatMuxer;
  limiter: ConcurrencyLimiter;
  outFile: string;
  codec?: CodecState;
  hw?: HardwareContext;
  width: number;
  height: number;
}

export class EncoderPipeline {
  private _s: PipelineState;
  private _disposed = false;

  private constructor(s: PipelineState) {
    this._s = s;
  }

  static async create(opts: EncoderPipelineOptions): Promise<EncoderPipeline> {
    const { width, height, outFile, withAudio = false } = opts;
    const muxer = new FormatMuxer(outFile);
    const { video, hwVideo, codec, hw } = await createVideoEncoder(opts, muxer);

    let audio: AudioEncoder | undefined;
    if (withAudio) {
      audio = await AudioEncoder.create({
        outSampleRate: 44_100,
        outSampleFmt: AV_SAMPLE_FMT_FLTP,
        codecName: FF_ENCODER_AAC,
        globalHeader: true,
        bitrate: 128_000,
        muxer,
      });
    }

    await muxer.open();
    return new EncoderPipeline({
      video,
      hwVideo,
      audio,
      muxer,
      limiter: new ConcurrencyLimiter(1),
      outFile,
      codec,
      hw,
      width,
      height,
    });
  }

  setupAudio(sampleRate: number): void {
    this._s.audio?.setInputRate(sampleRate);
  }

  async encodeBGRA(input: Buffer): Promise<void> {
    await this._s.limiter.schedule(async () => {
      const { hwVideo, video, codec, muxer } = this._s;
      if (hwVideo) {
        using frame = this.bgraFrame(input);
        await hwVideo.encode(frame, muxer);
        return;
      }
      const { src, dst, sws } = codec!;
      ok(sws, "sws not initialized");
      FFmpegError.throwIfError(src.makeWritable(), "bgraSrc.makeWritable");
      FFmpegError.throwIfError(src.fromBuffer(input), "bgraSrc.fromBuffer");
      FFmpegError.throwIfError(dst.makeWritable(), "bgraDst.makeWritable");
      FFmpegError.throwIfError(await sws.scaleFrame(dst, src), "bgraSws.scaleFrame");
      return video!.encode(dst, muxer);
    });
  }

  async encodePNG(pngData: Buffer): Promise<void> {
    await this._s.limiter.schedule(async () => {
      const { hwVideo, video, codec, muxer, width, height } = this._s;
      const cs = codec ?? (await CodecState.create(width, height));
      try {
        const src = await cs.decodePNG(pngData);
        if (hwVideo) {
          await hwVideo.encode(src, muxer);
        } else {
          FFmpegError.throwIfError(cs.dst.makeWritable(), "pngDst.makeWritable");
          FFmpegError.throwIfError(await cs.sws.scaleFrame(cs.dst, src), "pngSws.scaleFrame");
          await video!.encode(cs.dst, muxer);
        }
      } finally {
        if (!codec) cs[Symbol.dispose]();
      }
    });
  }

  async encodeAudio(pcm: Buffer): Promise<void> {
    const { audio, limiter, muxer } = this._s;
    if (audio) await limiter.schedule(() => audio.encode(pcm, muxer));
  }

  async finish(): Promise<string> {
    const { video, hwVideo, audio, muxer, limiter } = this._s;
    try {
      await using _m = muxer;
      using _v = video;
      using _hv = hwVideo;
      using _a = audio;
      await limiter.drain();
      await audio?.flush(muxer);
      if (hwVideo) {
        await hwVideo.flush(muxer);
      } else {
        await video!.flush(muxer);
      }
    } finally {
      this.free();
    }
    return this._s.outFile;
  }

  async [Symbol.asyncDispose](): Promise<void> {
    if (this._disposed) return;
    const { video, hwVideo, audio, muxer, limiter } = this._s;
    await limiter.drain();
    video?.[Symbol.dispose]();
    hwVideo?.[Symbol.dispose]();
    audio?.[Symbol.dispose]();
    await muxer[Symbol.asyncDispose]();
    this.free();
  }

  private free(): void {
    if (this._disposed) return;
    this._disposed = true;
    using _codec = this._s.codec;
    this._s.hw?.dispose();
  }

  private bgraFrame(input: Buffer): Frame {
    const frame = makeFrame(this._s.width, this._s.height, AV_PIX_FMT_BGRA);
    FFmpegError.throwIfError(frame.fromBuffer(input), "bgraFrame.fromBuffer");
    return frame;
  }
}
