// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/24.

import { ok } from "node:assert";
import { FFmpegError, type Frame } from "node-av";
import type { HardwareContext } from "node-av/api";
import type { AudioEncoder } from "./audio";
import type { CodecState } from "./codec";
import { createAudio, createMp4Video, createWebmVideo, type HwEncoder } from "./factory";
import { FormatMuxer } from "./muxer";
import type { VideoEncoder } from "./video";

export type SinkKind = "mp4" | "webm";

export interface SinkOptions {
  outFile: string;
  kind: SinkKind;
  width: number;
  height: number;
  fps: number;
  withAudio: boolean;
  disableHwCodec: boolean;
  sharedHw?: HardwareContext;
}

interface SinkState {
  muxer: FormatMuxer;
  video?: VideoEncoder;
  hwVideo?: HwEncoder;
  audio?: AudioEncoder;
  codec?: CodecState;
  ownsHw: boolean;
  hw?: HardwareContext;
  opts: SinkOptions;
}

export class OutputSink implements AsyncDisposable {
  private _s: SinkState;
  private _disposed = false;

  private constructor(s: SinkState) {
    this._s = s;
  }

  static kindFromPath(path: string): SinkKind {
    const lower = path.toLowerCase();
    if (lower.endsWith(".webm")) {
      return "webm";
    }
    if (lower.endsWith(".mp4") || lower.endsWith(".mov")) {
      return "mp4";
    }
    throw new Error(`Unsupported output extension: ${path}`);
  }

  static async create(opts: SinkOptions): Promise<OutputSink> {
    // Partial-construction safety: dispose muxer/encoders if a later step throws; move() disowns on success.
    await using stack = new AsyncDisposableStack();
    const muxer = stack.use(new FormatMuxer(opts.outFile));
    const setup = opts.kind === "mp4" ? await createMp4Video(opts, muxer) : await createWebmVideo(opts, muxer);
    if (setup.video) {
      stack.use(setup.video);
    }
    if (setup.hwVideo) {
      stack.use(setup.hwVideo);
    }
    if (setup.codec) {
      stack.use(setup.codec);
    }
    // Only a sink-owned hw device is ours to free here; a shared device belongs to the pipeline.
    if (setup.ownsHw && setup.hw) {
      stack.use(setup.hw);
    }
    const audio = opts.withAudio ? await createAudio(opts.kind, muxer) : undefined;
    if (audio) {
      stack.use(audio);
    }
    await muxer.open();
    stack.move();
    return new OutputSink({ muxer, ...setup, audio, opts });
  }

  setInputRate(sampleRate: number): void {
    this._s.audio?.setInputRate(sampleRate);
  }

  async encodeBGRA(bgraFrame: Frame): Promise<void> {
    const { hwVideo, muxer } = this._s;
    if (hwVideo) {
      return hwVideo.encode(bgraFrame, muxer);
    }
    return this.swEncode(bgraFrame);
  }

  async encodeDecodedFrame(src: Frame): Promise<void> {
    const { hwVideo, muxer } = this._s;
    if (hwVideo) {
      return hwVideo.encode(src, muxer);
    }
    return this.swEncode(src);
  }

  async encodeAudio(pcm: Buffer): Promise<void> {
    await this._s.audio?.encode(pcm, this._s.muxer);
  }

  async flush(): Promise<void> {
    const { hwVideo, video, audio, muxer } = this._s;
    await audio?.flush(muxer);
    if (hwVideo) {
      await hwVideo.flush(muxer);
    } else {
      await video!.flush(muxer);
    }
  }

  async [Symbol.asyncDispose](): Promise<void> {
    if (this._disposed) {
      return;
    }
    this._disposed = true;
    const { muxer, video, hwVideo, audio, codec, hw, ownsHw } = this._s;
    video?.[Symbol.dispose]();
    hwVideo?.[Symbol.dispose]();
    audio?.[Symbol.dispose]();
    codec?.[Symbol.dispose]();
    await muxer[Symbol.asyncDispose]();
    if (ownsHw) {
      hw?.dispose();
    }
  }

  private async swEncode(src: Frame): Promise<void> {
    const { video, codec, muxer } = this._s;
    ok(codec?.sws, "sws not initialized");
    FFmpegError.throwIfError(codec.dst.makeWritable(), "sinkDst.makeWritable");
    FFmpegError.throwIfError(await codec.sws.scaleFrame(codec.dst, src), "sinkSws.scaleFrame");
    await video!.encode(codec.dst, muxer);
  }
}
