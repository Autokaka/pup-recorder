// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/01.

import { FFmpegError } from "node-av";
import { AV_PIX_FMT_YUVA420P, AV_SAMPLE_FMT_FLTP, FF_ENCODER_AAC, FF_ENCODER_LIBX265 } from "node-av/constants";

import { ok } from "assert";
import { ConcurrencyLimiter } from "../limiter.js";
import { AudioEncoder } from "./audio";
import { CodecState } from "./codec.js";
import { FormatMuxer } from "./muxer";
import { VideoEncoder } from "./video";

export interface EncoderPipelineOptions {
  width: number;
  height: number;
  fps: number;
  outFile: string;
  withAudio?: boolean;
}

export class EncoderPipeline {
  private _disposed = false;

  private constructor(
    private _video: VideoEncoder,
    private _audio: AudioEncoder | undefined,
    private _muxer: FormatMuxer,
    private _limiter: ConcurrencyLimiter,
    private _outFile: string,
    private _codec: CodecState,
  ) {}

  static async create(opts: EncoderPipelineOptions): Promise<EncoderPipeline> {
    const { width, height, fps, outFile, withAudio = false } = opts;
    const muxer = new FormatMuxer(outFile);

    const video = await VideoEncoder.create({
      width,
      height,
      fps,
      codecName: FF_ENCODER_LIBX265,
      codecTag: "hvc1",
      globalHeader: true,
      codecOpts: { preset: "ultrafast", "x265-params": "log-level=1:bframes=0" },
      bitrate: 8_000_000,
      pixelFormat: AV_PIX_FMT_YUVA420P,
      muxer,
    });

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

    return new EncoderPipeline(
      video,
      audio,
      muxer,
      new ConcurrencyLimiter(1),
      outFile,
      await CodecState.create(width, height),
    );
  }

  setupAudio(sampleRate: number): void {
    this._audio?.setInputRate(sampleRate);
  }

  async encodeBGRA(input: Buffer): Promise<void> {
    await this._limiter.schedule(async () => {
      const { src, dst, sws } = this._codec;
      ok(sws, "sws not initialized");
      FFmpegError.throwIfError(src.makeWritable(), "bgraSrc.makeWritable");
      FFmpegError.throwIfError(src.fromBuffer(input), "bgraSrc.fromBuffer");
      FFmpegError.throwIfError(dst.makeWritable(), "bgraDst.makeWritable");
      FFmpegError.throwIfError(await sws.scaleFrame(dst, src), "bgraSws.scaleFrame");
      return this._video.encode(dst, this._muxer);
    });
  }

  async encodePNG(pngData: Buffer): Promise<void> {
    await this._limiter.schedule(async () => {
      const { pkt, src, dst } = this._codec;
      using png = await this._codec.png();
      pkt.data = pngData;
      FFmpegError.throwIfError(await png.sendPacket(pkt), "pngDecoder.sendPacket");
      pkt.unref();
      FFmpegError.throwIfError(await png.receiveFrame(src), "pngDecoder.receiveFrame");
      FFmpegError.throwIfError(dst.makeWritable(), "pngDst.makeWritable");
      // NOTE(Autokaka): Must access sws here since it depends on src format
      FFmpegError.throwIfError(await this._codec.sws.scaleFrame(dst, src), "pngSws.scaleFrame");
      return this._video.encode(dst, this._muxer);
    });
  }

  async encodeAudio(pcm: Buffer): Promise<void> {
    if (this._audio) await this._limiter.schedule(() => this._audio!.encode(pcm, this._muxer));
  }

  async finish(): Promise<string> {
    try {
      await using _m = this._muxer;
      using _v = this._video;
      using _a = this._audio;
      await this._limiter.end();
      await this._audio?.flush(this._muxer);
      await this._video.flush(this._muxer);
    } finally {
      this.free();
    }
    return this._outFile;
  }

  async [Symbol.asyncDispose](): Promise<void> {
    if (this._disposed) return;
    await this._limiter.end();
    this._video[Symbol.dispose]();
    this._audio?.[Symbol.dispose]();
    await this._muxer[Symbol.asyncDispose]();
    this.free();
  }

  private free(): void {
    if (this._disposed) return;
    this._disposed = true;
    using _codec = this._codec;
  }
}
