// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/12.

import { Codec, type CodecContext, FFmpegError, type Frame, type Packet, type Stream } from "node-av";
import {
  AV_PIX_FMT_BGRA,
  AV_PIX_FMT_YUV420P,
  AVERROR_EAGAIN,
  AVERROR_EOF,
  FF_ENCODER_HEVC_NVENC,
} from "node-av/constants";
import { makeFrame, makePacket, openVideoCtx } from "../misc";
import type { FormatMuxer } from "../muxer";
import type { HwVideoEncoderOptions } from "../videotoolbox";
import { buildUnifiedExtradata, extractAlphaToYuv420pBuffer } from "./alpha";
import { patchHevcAlphaPtl } from "./alpha_darwin";
import { DualLayerMux } from "./dual_layer_mux";
import { type NvencHevcConfig, parseNvencHevcConfig } from "./parser";

interface NvencState {
  baseCtx: CodecContext;
  alphaCtx: CodecContext;
  basePkt: Packet;
  alphaPkt: Packet;
  stream: Stream;
  alphaSwFrame: Frame;
  alphaBuf: Buffer;
  hevcCfg: NvencHevcConfig;
}

export class NvencDualLayerEncoder implements Disposable {
  private _s: NvencState;
  private _mux: DualLayerMux;
  private _pts = 0n;

  private constructor(s: NvencState) {
    this._s = s;
    this._mux = new DualLayerMux({
      baseCtx: s.baseCtx,
      alphaCtx: s.alphaCtx,
      basePkt: s.basePkt,
      alphaPkt: s.alphaPkt,
      stream: s.stream,
      hevcCfg: s.hevcCfg,
    });
  }

  static async create(opts: HwVideoEncoderOptions): Promise<NvencDualLayerEncoder> {
    const { width, height, fps, bitrate, muxer } = opts;

    const codec = Codec.findEncoderByName(FF_ENCODER_HEVC_NVENC);
    if (!codec) {
      throw new Error("hevc_nvenc encoder not found");
    }

    // tier=main matches Apple VideoToolbox; macOS Chrome requires Main tier for HEVC alpha decode.
    const nvencOpts = { preset: "p4", bf: "0", tier: "main" };
    const common = { codec, width, height, fps, bitrate, options: nvencOpts };
    // BGRA direct — NVENC converts internally, no CPU SWS, no hwFramesCtx needed.
    // Partial-construction safety: stack frees every native resource if a later step throws; move() disowns on success.
    using stack = new DisposableStack();
    const baseCtx = stack.use(await openVideoCtx({ ...common, pixelFormat: AV_PIX_FMT_BGRA }, "nvenc.base.open2"));
    const alphaCtx = stack.use(await openVideoCtx({ ...common, pixelFormat: AV_PIX_FMT_YUV420P }, "nvenc.alpha.open2"));

    if (!baseCtx.extraData || !alphaCtx.extraData) {
      throw new Error("nvenc: codec extradata missing");
    }
    const hevcCfg = parseNvencHevcConfig(baseCtx.extraData);

    const stream = muxer.addStream(baseCtx, "hvc1");
    const unified = buildUnifiedExtradata({
      baseExtradata: baseCtx.extraData,
      alphaExtradata: alphaCtx.extraData,
      width,
      height,
    });
    // Apple-VTB compat: rewrite VPS+SPS PTL bits to match x265/VTB output (tier=Main, compat[2]=1).
    stream.codecpar.extradata = patchHevcAlphaPtl(unified);

    const ySize = width * height;
    // YUV420P chroma planes are ceil(w/2)×ceil(h/2); floor underflows on odd dimensions.
    const chromaSize = ((width + 1) >> 1) * ((height + 1) >> 1);
    const alphaBuf = Buffer.alloc(ySize + chromaSize * 2);
    alphaBuf.fill(128, ySize);

    const basePkt = stack.use(makePacket());
    const alphaPkt = stack.use(makePacket());
    const alphaSwFrame = stack.use(makeFrame(width, height, AV_PIX_FMT_YUV420P));

    stack.move();
    return new NvencDualLayerEncoder({
      baseCtx,
      alphaCtx,
      basePkt,
      alphaPkt,
      stream,
      alphaSwFrame,
      alphaBuf,
      hevcCfg,
    });
  }

  async encode(bgraFrame: Frame, muxer: FormatMuxer): Promise<void> {
    const { baseCtx, alphaCtx, alphaSwFrame, alphaBuf } = this._s;
    const pts = this._pts++;

    // Extract the alpha plane before base.sendFrame — the encoder unrefs the input frame.
    extractAlphaToYuv420pBuffer(bgraFrame, alphaBuf);
    FFmpegError.throwIfError(alphaSwFrame.makeWritable(), "alphaSw.makeWritable");
    FFmpegError.throwIfError(alphaSwFrame.fromBuffer(alphaBuf), "alphaSw.fromBuffer");
    alphaSwFrame.pts = pts;
    alphaSwFrame.duration = 1n;

    bgraFrame.pts = pts;
    bgraFrame.duration = 1n;
    FFmpegError.throwIfError(await baseCtx.sendFrame(bgraFrame), "base.sendFrame");
    FFmpegError.throwIfError(await alphaCtx.sendFrame(alphaSwFrame), "alpha.sendFrame");

    await this._mux.drain(muxer);
  }

  async flush(muxer: FormatMuxer): Promise<void> {
    await this.sendEof(this._s.baseCtx, "base");
    await this.sendEof(this._s.alphaCtx, "alpha");
    await this._mux.drain(muxer);
    const desync = this._mux.desyncAfterEof();
    if (desync) {
      throw new Error(`NVENC desync: ${desync}`);
    }
  }

  [Symbol.dispose](): void {
    const { basePkt, alphaPkt, baseCtx, alphaCtx, alphaSwFrame } = this._s;
    basePkt.free();
    alphaPkt.free();
    alphaSwFrame.free();
    // NVIDIA driver 520.56.06+ UAF in libnvcuvid when NVENC sessions freed in creation order.
    // LIFO destroy avoids the segfault. Per NVIDIA forum /t/269974.
    alphaCtx.freeContext();
    baseCtx.freeContext();
  }

  // EOF flush; EAGAIN/EOF returns are benign (already-draining encoder).
  private async sendEof(ctx: CodecContext, tag: string): Promise<void> {
    const ret = await ctx.sendFrame(null);
    if (ret < 0 && ret !== AVERROR_EAGAIN && ret !== AVERROR_EOF) {
      FFmpegError.throwIfError(ret, `nvenc.${tag}.sendFrame(null)`);
    }
  }
}
