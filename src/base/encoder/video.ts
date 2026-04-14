// Created by Autokaka (qq1909698494@gmail.com) on 2026/03/21.

import { Codec, type CodecContext, FFmpegError, Frame, type Packet, type Stream } from "node-av";
import { type AVPixelFormat, type FFVideoEncoder } from "node-av/constants";
import { drainPackets, makePacket, openVideoCtx } from "./misc";
import type { FormatMuxer } from "./muxer";

export interface VideoEncoderOptions {
  width: number;
  height: number;
  fps: number;
  codecName: FFVideoEncoder;
  codecTag?: string;
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
    const { codecName, codecTag, codecOpts, muxer, ...rest } = opts;

    const codec = Codec.findEncoderByName(codecName);
    if (!codec) throw new Error(`Video encoder not found: ${codecName}`);

    const ctx = await openVideoCtx({ codec, ...rest, codecTag, options: codecOpts }, "videoCtx.open2");
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
