// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/24.

import { ok } from "node:assert";
import { FFmpegError, type Frame } from "node-av";
import type { HardwareContext } from "node-av/api";
import {
  AV_PIX_FMT_YUVA420P,
  AV_SAMPLE_FMT_FLT,
  AV_SAMPLE_FMT_FLTP,
  FF_ENCODER_AAC,
  FF_ENCODER_LIBOPUS,
} from "node-av/constants";
import { AudioEncoder } from "./audio";
import { CodecState } from "./codec";
import { createHwVideoEncoder, type HwEncoder, type VideoSetup } from "./factory";
import { FF_ENCODER_LIBVPX_VP9 } from "./misc";
import { FormatMuxer } from "./muxer";
import { VideoEncoder } from "./video";

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
    const setup =
      opts.kind === "mp4" ? await OutputSink.mp4Video(opts, muxer) : await OutputSink.webmVideo(opts, muxer);
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
    const audio = opts.withAudio ? await OutputSink.audioFor(opts, muxer) : undefined;
    if (audio) {
      stack.use(audio);
    }
    await muxer.open();
    stack.move();
    return new OutputSink({ muxer, ...setup, audio, opts });
  }

  private static mp4Video(opts: SinkOptions, muxer: FormatMuxer): Promise<VideoSetup> {
    const { width, height, fps, disableHwCodec, sharedHw } = opts;
    return createHwVideoEncoder({ width, height, fps, disableHwCodec, sharedHw }, muxer);
  }

  private static async webmVideo(opts: SinkOptions, muxer: FormatMuxer): Promise<VideoSetup> {
    const { width, height, fps } = opts;
    const video = await VideoEncoder.create({
      width,
      height,
      fps,
      codecName: FF_ENCODER_LIBVPX_VP9,
      codecOpts: {
        deadline: "realtime",
        "cpu-used": "8",
        "row-mt": "1",
        threads: "2",
      },
      bitrate: 4_000_000,
      pixelFormat: AV_PIX_FMT_YUVA420P,
      muxer,
    });
    return {
      video,
      codec: await CodecState.create(width, height),
      ownsHw: false,
    };
  }

  private static audioFor(opts: SinkOptions, muxer: FormatMuxer): Promise<AudioEncoder> {
    // Opus rejects 44.1k.
    const cfg =
      opts.kind === "mp4"
        ? {
            outSampleRate: 44_100,
            outSampleFmt: AV_SAMPLE_FMT_FLTP,
            codecName: FF_ENCODER_AAC,
          }
        : {
            outSampleRate: 48_000,
            outSampleFmt: AV_SAMPLE_FMT_FLT,
            codecName: FF_ENCODER_LIBOPUS,
          };
    return AudioEncoder.create({
      ...cfg,
      globalHeader: true,
      bitrate: 128_000,
      muxer,
    });
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
