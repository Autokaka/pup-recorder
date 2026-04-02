// Created by Autokaka (qq1909698494@gmail.com) on 2026/03/21.

import { Codec, CodecContext, FFmpegError, Frame, Packet, Rational } from "node-av";
import {
  AV_CODEC_FLAG_GLOBAL_HEADER,
  AVERROR_EAGAIN,
  AVERROR_EOF,
  FF_THREAD_SLICE,
  type AVPixelFormat,
  type FFVideoEncoder,
} from "node-av/constants";
import type { FormatMuxer } from "./muxer";

export interface VideoEncoderOptions {
  width: number;
  height: number;
  fps: number;
  codecName: FFVideoEncoder;
  codecTag?: string;
  globalHeader: boolean;
  codecOpts: Record<string, string>;
  bitrate: number;
  pixelFormat: AVPixelFormat;
  threadCount?: number;
  muxer: FormatMuxer;
}

type Stream = ReturnType<import("node-av").FormatContext["newStream"]>;

export class VideoEncoder implements Disposable {
  private readonly _ctx: CodecContext;
  private readonly _pkt: Packet;
  private readonly _stream: Stream;
  private _pts = 0n;

  private constructor(ctx: CodecContext, pkt: Packet, stream: Stream) {
    this._ctx = ctx;
    this._pkt = pkt;
    this._stream = stream;
  }

  static async create(opts: VideoEncoderOptions): Promise<VideoEncoder> {
    const { width, height, fps, codecName, codecTag, globalHeader, codecOpts, bitrate, threadCount, muxer } = opts;

    const codec = Codec.findEncoderByName(codecName);
    if (!codec) throw new Error(`Video encoder not found: ${codecName}`);

    const ctx = new CodecContext();
    ctx.allocContext3(codec);
    ctx.codecId = codec.id;
    ctx.width = width;
    ctx.height = height;
    ctx.pixelFormat = opts.pixelFormat;
    ctx.timeBase = new Rational(1, fps);
    ctx.framerate = new Rational(fps, 1);
    ctx.gopSize = fps * 2;
    ctx.bitRate = BigInt(bitrate);
    if (threadCount) {
      ctx.threadCount = threadCount;
      ctx.threadType = FF_THREAD_SLICE;
    }
    if (globalHeader) ctx.setFlags(AV_CODEC_FLAG_GLOBAL_HEADER);
    for (const [k, v] of Object.entries(codecOpts)) ctx.setOption(k, v);
    if (codecTag) ctx.codecTag = codecTag;
    FFmpegError.throwIfError(await ctx.open2(codec, null), "videoCtx.open2");

    const pkt = new Packet();
    pkt.alloc();

    const stream = muxer.addStream(ctx, codecTag);
    return new VideoEncoder(ctx, pkt, stream);
  }

  async encode(frame: Frame, muxer: FormatMuxer): Promise<void> {
    frame.pts = this._pts++;
    frame.duration = 1n;
    FFmpegError.throwIfError(await this._ctx.sendFrame(frame), "videoCtx.sendFrame");
    await this.drain(muxer);
  }

  async flush(muxer: FormatMuxer): Promise<void> {
    await this._ctx.sendFrame(null);
    await this.drain(muxer);
  }

  [Symbol.dispose](): void {
    this._pkt.free();
    this._ctx.freeContext();
  }

  private async drain(muxer: FormatMuxer): Promise<void> {
    const pkt = this._pkt;
    while (true) {
      const r = await this._ctx.receivePacket(pkt);
      if (r === AVERROR_EAGAIN || r === AVERROR_EOF) break;
      FFmpegError.throwIfError(r, "video.receivePacket");
      pkt.streamIndex = this._stream.index;
      if (pkt.duration === 0n) pkt.duration = 1n;
      pkt.rescaleTs(this._ctx.timeBase, this._stream.timeBase);
      await muxer.writePacket(pkt);
      pkt.unref();
    }
  }
}
