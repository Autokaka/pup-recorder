// Created by Autokaka (qq1909698494@gmail.com) on 2026/03/21.

import { Codec, CodecContext, FFmpegError, Frame, Packet, Rational, SoftwareScaleContext } from "node-av";
import {
  AV_CODEC_FLAG_GLOBAL_HEADER,
  AV_PIX_FMT_BGRA,
  AV_PIX_FMT_YUV420P,
  AV_PIX_FMT_YUVA420P,
  AVERROR_EAGAIN,
  AVERROR_EOF,
  SWS_BILINEAR,
  type FFVideoEncoder,
} from "node-av/constants";
import type { FormatMuxer } from "./muxer";

export interface VideoEncoderOptions {
  width: number;
  height: number;
  fps: number;
  codecName: FFVideoEncoder;
  pixFmt: typeof AV_PIX_FMT_YUVA420P | typeof AV_PIX_FMT_YUV420P;
  codecTag?: string;
  globalHeader: boolean;
  codecOpts: Record<string, string>;
  bitrate: number;
  muxer: FormatMuxer;
}

type Stream = ReturnType<import("node-av").FormatContext["newStream"]>;

export class VideoEncoder implements Disposable {
  private readonly _ctx: CodecContext;
  private readonly _sws: SoftwareScaleContext;
  private readonly _src: Frame;
  private readonly _dst: Frame;
  private readonly _pkt: Packet;
  private readonly _stream: Stream;
  pts = 0n;

  private constructor(
    ctx: CodecContext,
    sws: SoftwareScaleContext,
    src: Frame,
    dst: Frame,
    pkt: Packet,
    stream: Stream,
  ) {
    this._ctx = ctx;
    this._sws = sws;
    this._src = src;
    this._dst = dst;
    this._pkt = pkt;
    this._stream = stream;
  }

  static async create(opts: VideoEncoderOptions): Promise<VideoEncoder> {
    const { width, height, fps, codecName, pixFmt, codecTag, globalHeader, codecOpts, bitrate, muxer } = opts;

    const codec = Codec.findEncoderByName(codecName);
    if (!codec) throw new Error(`Video encoder not found: ${codecName}`);

    const ctx = new CodecContext();
    ctx.allocContext3(codec);
    ctx.codecId = codec.id;
    ctx.width = width;
    ctx.height = height;
    ctx.pixelFormat = pixFmt;
    ctx.timeBase = new Rational(1, fps);
    ctx.framerate = new Rational(fps, 1);
    ctx.gopSize = fps;
    ctx.bitRate = BigInt(bitrate);
    ctx.setOption("threads", "4");
    if (globalHeader) ctx.setFlags(AV_CODEC_FLAG_GLOBAL_HEADER);
    for (const [k, v] of Object.entries(codecOpts)) ctx.setOption(k, v);
    if (codecTag) ctx.codecTag = codecTag;
    FFmpegError.throwIfError(await ctx.open2(codec, null), "videoCtx.open2");

    const sws = new SoftwareScaleContext();
    sws.getContext(width, height, AV_PIX_FMT_BGRA, width, height, pixFmt, SWS_BILINEAR);

    const dst = new Frame();
    dst.alloc();
    dst.format = pixFmt;
    dst.width = width;
    dst.height = height;
    FFmpegError.throwIfError(dst.getBuffer(0), "dstFrame.getBuffer");

    // Pre-allocate src frame (BGRA, reused every encode)
    const src = new Frame();
    src.alloc();
    src.format = AV_PIX_FMT_BGRA;
    src.width = width;
    src.height = height;
    FFmpegError.throwIfError(src.getBuffer(0), "srcFrame.getBuffer");

    // Pre-allocate reusable packet
    const pkt = new Packet();
    pkt.alloc();

    const stream = muxer.addStream(ctx, codecTag);
    return new VideoEncoder(ctx, sws, src, dst, pkt, stream);
  }

  get stream() {
    return this._stream;
  }
  get timeBase() {
    return this._ctx.timeBase;
  }

  async encode(bgra: Buffer, muxer: FormatMuxer): Promise<void> {
    const { _src: src, _dst: dst, _sws: sws } = this;

    // Reuse src frame: makeWritable + fromBuffer + pts
    FFmpegError.throwIfError(src.makeWritable(), "src.makeWritable");
    FFmpegError.throwIfError(src.fromBuffer(bgra), "src.fromBuffer");
    src.pts = this.pts;

    FFmpegError.throwIfError(dst.makeWritable(), "dst.makeWritable");
    FFmpegError.throwIfError(await sws.scaleFrame(dst, src), "sws.scaleFrame");

    dst.pts = this.pts++;
    FFmpegError.throwIfError(await this._ctx.sendFrame(dst), "videoCtx.sendFrame");
    await this.drain(muxer);
  }

  async flush(muxer: FormatMuxer): Promise<void> {
    await this._ctx.sendFrame(null);
    await this.drain(muxer);
  }

  [Symbol.dispose](): void {
    this._pkt.free();
    this._src.free();
    this._dst.free();
    this._sws[Symbol.dispose]();
    this._ctx.freeContext();
  }

  private async drain(muxer: FormatMuxer): Promise<void> {
    const pkt = this._pkt;
    while (true) {
      const r = await this._ctx.receivePacket(pkt);
      if (r === AVERROR_EAGAIN || r === AVERROR_EOF) break;
      FFmpegError.throwIfError(r, "video.receivePacket");
      pkt.streamIndex = this._stream.index;
      pkt.rescaleTs(this._ctx.timeBase, this._stream.timeBase);
      await muxer.writePacket(pkt);
      pkt.unref();
    }
  }
}
