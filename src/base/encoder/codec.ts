// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/03.

import { ok } from "assert";
import {
  AV_PIX_FMT_BGRA,
  AV_PIX_FMT_YUVA420P,
  Codec,
  CodecContext,
  FF_DECODER_PNG,
  FFmpegError,
  type Frame,
  Packet,
  SoftwareScaleContext,
  SWS_BILINEAR,
  type AVPixelFormat,
} from "node-av";
import { makeFrame, makePacket } from "./misc";

export class CodecState implements Disposable {
  readonly src: Frame;
  readonly dst: Frame;
  readonly pkt: Packet;
  private _sws?: SoftwareScaleContext;
  private _png?: Codec;

  static async create(width: number, height: number) {
    const codec = Codec.findDecoderByName(FF_DECODER_PNG);
    ok(codec, "png decoder unavailable");
    return new CodecState(width, height, codec);
  }

  private constructor(width: number, height: number, png: Codec) {
    this._png = png;
    this.src = makeFrame(width, height, AV_PIX_FMT_BGRA);
    this.dst = makeFrame(width, height, AV_PIX_FMT_YUVA420P);
    this.pkt = makePacket();
  }

  /**
   * Create a fresh PNG decoder context.
   * The FFmpeg PNG decoder accumulates APNG blending state
   * across frames, so a shared instance corrupts output when decoding standalone PNGs.
   */
  async png(): Promise<CodecContext> {
    const png = new CodecContext();
    png.allocContext3(this._png);
    FFmpegError.throwIfError(await png.open2(this._png), "pngDecoder.open2");
    return png;
  }

  async decodePNG(pngData: Buffer): Promise<Frame> {
    using png = await this.png();
    this.pkt.data = pngData;
    FFmpegError.throwIfError(await png.sendPacket(this.pkt), "pngDecoder.sendPacket");
    this.pkt.unref();
    FFmpegError.throwIfError(await png.receiveFrame(this.src), "pngDecoder.receiveFrame");
    return this.src;
  }

  get sws() {
    if (!this._sws) {
      const sws = new SoftwareScaleContext();
      const fmt = this.src.format as AVPixelFormat;
      sws.getContext(
        this.src.width,
        this.src.height,
        fmt,
        this.src.width,
        this.src.height,
        AV_PIX_FMT_YUVA420P,
        SWS_BILINEAR,
      );
      this._sws = sws;
    }
    return this._sws;
  }

  [Symbol.dispose](): void {
    this.src[Symbol.dispose]();
    this.dst[Symbol.dispose]();
    this.pkt[Symbol.dispose]();
    this._sws?.[Symbol.dispose]();
  }
}
