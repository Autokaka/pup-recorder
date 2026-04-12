// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/12.

import { CodecContext, FFmpegError, Frame, type Packet, Rational, type Stream } from "node-av";
import type { HardwareContext } from "node-av/api";
import { AV_CODEC_FLAG_GLOBAL_HEADER, AV_PIX_FMT_BGRA, AVCOL_RANGE_JPEG } from "node-av/constants";
import { drainPackets, makePacket } from "./shared";
import type { FormatMuxer } from "./muxer";

export interface HwVideoEncoderOptions {
  width: number;
  height: number;
  fps: number;
  hw: HardwareContext;
  bitrate: number;
  muxer: FormatMuxer;
}

export class VideoToolboxEncoder implements Disposable {
  private _ctx: CodecContext;
  private _pkt: Packet;
  private _stream: Stream;
  private _pts = 0n;

  private constructor(ctx: CodecContext, pkt: Packet, stream: Stream) {
    this._ctx = ctx;
    this._pkt = pkt;
    this._stream = stream;
  }

  static async create(opts: HwVideoEncoderOptions): Promise<VideoToolboxEncoder> {
    const { width, height, fps, hw, bitrate, muxer } = opts;

    const codec = hw.getEncoderCodec("hevc");
    if (!codec) throw new Error("hevc_videotoolbox encoder not found");

    const ctx = new CodecContext();
    ctx.allocContext3(codec);
    ctx.codecId = codec.id;
    ctx.width = width;
    ctx.height = height;
    ctx.pixelFormat = AV_PIX_FMT_BGRA;
    ctx.colorRange = AVCOL_RANGE_JPEG;
    ctx.timeBase = new Rational(1, fps);
    ctx.framerate = new Rational(fps, 1);
    ctx.gopSize = fps * 2;
    ctx.bitRate = BigInt(bitrate);
    ctx.setFlags(AV_CODEC_FLAG_GLOBAL_HEADER);
    ctx.setOption("alpha_quality", "1");
    ctx.codecTag = "hvc1";

    FFmpegError.throwIfError(await ctx.open2(codec, null), "vtEnc.open2");

    const stream = muxer.addStream(ctx, "hvc1");
    return new VideoToolboxEncoder(ctx, makePacket(), stream);
  }

  async encode(bgraFrame: Frame, muxer: FormatMuxer): Promise<void> {
    bgraFrame.pts = this._pts++;
    bgraFrame.duration = 1n;
    FFmpegError.throwIfError(await this._ctx.sendFrame(bgraFrame), "vtEnc.sendFrame");
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
