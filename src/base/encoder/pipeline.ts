// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/01.

import { FFmpegError, Frame } from "node-av";
import { HardwareContext } from "node-av/api";
import { AV_PIX_FMT_BGRA, FF_HWDEVICE_TYPE_CUDA, FF_HWDEVICE_TYPE_VIDEOTOOLBOX } from "node-av/constants";

import { ConcurrencyLimiter } from "../limiter";
import { CodecState } from "./codec";
import { makeFrame } from "./misc";
import { OutputSink } from "./sink";

export interface EncoderPipelineOptions {
  width: number;
  height: number;
  fps: number;
  outFile: string;
  withAudio?: boolean;
  disableHwCodec?: boolean;
}

interface PipelineState {
  sinks: OutputSink[];
  sharedHw?: HardwareContext;
  limiter: ConcurrencyLimiter;
  pngCodec?: CodecState;
  width: number;
  height: number;
  outFiles: string[];
}

export class EncoderPipeline {
  private _s: PipelineState;
  private _disposed = false;

  private constructor(s: PipelineState) {
    this._s = s;
  }

  static async create(opts: EncoderPipelineOptions): Promise<EncoderPipeline> {
    const { width, height, fps, outFile, withAudio = false, disableHwCodec = false } = opts;
    const outFiles = outFile
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (outFiles.length === 0) throw new Error("outFile must contain at least one path");

    const kinds = outFiles.map((p) => OutputSink.kindFromPath(p));
    const needsMp4Hw = !disableHwCodec && kinds.includes("mp4");
    const sharedHw = needsMp4Hw ? (HardwareContext.auto() ?? undefined) : undefined;
    const isHwAlphaCapable =
      sharedHw?.deviceTypeName === FF_HWDEVICE_TYPE_VIDEOTOOLBOX || sharedHw?.deviceTypeName === FF_HWDEVICE_TYPE_CUDA;

    const sinks: OutputSink[] = [];
    for (let i = 0; i < outFiles.length; i++) {
      const sink = await OutputSink.create({
        outFile: outFiles[i]!,
        kind: kinds[i]!,
        width,
        height,
        fps,
        withAudio,
        disableHwCodec,
        sharedHw: kinds[i] === "mp4" && isHwAlphaCapable ? sharedHw : undefined,
      });
      sinks.push(sink);
    }

    return new EncoderPipeline({
      sinks,
      sharedHw,
      limiter: new ConcurrencyLimiter(1),
      width,
      height,
      outFiles,
    });
  }

  setupAudio(sampleRate: number): void {
    for (const sink of this._s.sinks) sink.setInputRate(sampleRate);
  }

  async encodeBGRA(input: Buffer): Promise<void> {
    await this._s.limiter.schedule(async () => {
      using frame = this.bgraFrame(input);
      await Promise.all(this._s.sinks.map((sink) => sink.encodeBGRA(frame)));
    });
  }

  async encodePNG(pngData: Buffer): Promise<void> {
    await this._s.limiter.schedule(async () => {
      const { width, height } = this._s;
      this._s.pngCodec ??= await CodecState.create(width, height);
      const src = await this._s.pngCodec.decodePNG(pngData);
      for (const sink of this._s.sinks) await sink.encodeDecodedFrame(src);
    });
  }

  async encodeAudio(pcm: Buffer): Promise<void> {
    await this._s.limiter.schedule(async () => {
      for (const sink of this._s.sinks) await sink.encodeAudio(pcm);
    });
  }

  async finish(): Promise<string[]> {
    try {
      await this._s.limiter.drain();
      for (const sink of this._s.sinks) await sink.flush();
    } finally {
      await this.free();
    }
    return this._s.outFiles;
  }

  async [Symbol.asyncDispose](): Promise<void> {
    if (this._disposed) return;
    await this._s.limiter.drain();
    await this.free();
  }

  private async free(): Promise<void> {
    if (this._disposed) return;
    this._disposed = true;
    for (const sink of this._s.sinks) await sink[Symbol.asyncDispose]();
    this._s.pngCodec?.[Symbol.dispose]();
    this._s.sharedHw?.dispose();
  }

  private bgraFrame(input: Buffer): Frame {
    const frame = makeFrame(this._s.width, this._s.height, AV_PIX_FMT_BGRA);
    FFmpegError.throwIfError(frame.fromBuffer(input), "bgraFrame.fromBuffer");
    return frame;
  }
}
