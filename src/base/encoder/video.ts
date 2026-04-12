// Created by Autokaka (qq1909698494@gmail.com) on 2026/03/21.

import { Codec, CodecContext, FFmpegError, Frame, type Packet, Rational, type Stream } from "node-av";
import { AV_CODEC_FLAG_GLOBAL_HEADER, type AVPixelFormat, type FFVideoEncoder } from "node-av/constants";
import { drainPackets, makePacket } from "./shared";
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
  muxer: FormatMuxer;
}

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
    const { width, height, fps, codecName, codecTag, globalHeader, codecOpts, bitrate, muxer } = opts;

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
    if (globalHeader) ctx.setFlags(AV_CODEC_FLAG_GLOBAL_HEADER);
    for (const [k, v] of Object.entries(codecOpts)) ctx.setOption(k, v);
    if (codecTag) ctx.codecTag = codecTag;
    FFmpegError.throwIfError(await ctx.open2(codec, null), "videoCtx.open2");

    const stream = muxer.addStream(ctx, codecTag);
    return new VideoEncoder(ctx, makePacket(), stream);
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

  private drain(muxer: FormatMuxer): Promise<void> {
    return drainPackets(this._ctx, this._pkt, this._stream, muxer);
  }
}
