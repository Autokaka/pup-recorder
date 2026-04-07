// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/03.

import { ok } from "assert";
import {
  AV_PIX_FMT_BGRA,
  AV_PIX_FMT_YUVA420P,
  Codec,
  CodecContext,
  FF_DECODER_PNG,
  FFmpegError,
  Frame,
  Packet,
  SoftwareScaleContext,
  SWS_BILINEAR,
  type AVPixelFormat,
} from "node-av";

function makeFrame(width: number, height: number, pixFmt: AVPixelFormat): Frame {
  const frame = new Frame();
  frame.alloc();
  frame.format = pixFmt;
  frame.width = width;
  frame.height = height;
  FFmpegError.throwIfError(frame.getBuffer(0), "frame.getBuffer");
  return frame;
}

function makeSWSContext(width: number, height: number, pixFmt: AVPixelFormat) {
  const sws = new SoftwareScaleContext();
  sws.getContext(width, height, pixFmt, width, height, AV_PIX_FMT_YUVA420P, SWS_BILINEAR);
  return sws;
}

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
    this.pkt = new Packet();
    this.pkt.alloc();
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

  get sws() {
    if (!this._sws) {
      this._sws = makeSWSContext(this.src.width, this.src.height, this.src.format as AVPixelFormat);
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
