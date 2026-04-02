// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/01.

import { cpus } from "os";
import { FFmpegError, Frame, SoftwareScaleContext } from "node-av";
import {
  AV_PIX_FMT_BGRA,
  AV_PIX_FMT_YUVA420P,
  AV_SAMPLE_FMT_FLTP,
  FF_ENCODER_AAC,
  FF_ENCODER_LIBX265,
  SWS_BILINEAR,
} from "node-av/constants";

import { ConcurrencyLimiter } from "../limiter";
import { AudioEncoder } from "./audio";
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
    private _sws: SoftwareScaleContext,
    private _srcFrame: Frame,
    private _dstFrame: Frame,
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
      threadCount: cpus().length,
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
    const limiter = new ConcurrencyLimiter(1);

    const srcFrame = new Frame();
    srcFrame.alloc();
    srcFrame.format = AV_PIX_FMT_BGRA;
    srcFrame.width = width;
    srcFrame.height = height;
    FFmpegError.throwIfError(srcFrame.getBuffer(0), "srcFrame.getBuffer");

    const sws = new SoftwareScaleContext();
    sws.getContext(width, height, AV_PIX_FMT_BGRA, width, height, AV_PIX_FMT_YUVA420P, SWS_BILINEAR);
    const dstFrame = new Frame();
    dstFrame.alloc();
    dstFrame.format = AV_PIX_FMT_YUVA420P;
    dstFrame.width = width;
    dstFrame.height = height;
    FFmpegError.throwIfError(dstFrame.getBuffer(0), "dstFrame.getBuffer");

    return new EncoderPipeline(video, audio, muxer, limiter, outFile, sws, srcFrame, dstFrame);
  }

  setupAudio(sampleRate: number): void {
    this._audio?.setInputRate(sampleRate);
  }

  async encodeFrame(input: Buffer): Promise<void> {
    await this._limiter.schedule(async () => {
      FFmpegError.throwIfError(this._srcFrame.makeWritable(), "srcFrame.makeWritable");
      FFmpegError.throwIfError(this._srcFrame.fromBuffer(input), "srcFrame.fromBuffer");
      FFmpegError.throwIfError(await this._sws.scaleFrame(this._dstFrame, this._srcFrame), "sws.scaleFrame");
      FFmpegError.throwIfError(this._dstFrame.makeWritable(), "dstFrame.makeWritable");
      return this._video.encode(this._dstFrame, this._muxer);
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
    this._srcFrame.free();
    this._dstFrame.free();
    this._sws[Symbol.dispose]();
  }
}
