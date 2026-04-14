// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/12.

import { Codec, type CodecContext, FFmpegError, Frame, type Packet, type Stream } from "node-av";
import { AV_PIX_FMT_BGRA, AV_PIX_FMT_YUV420P, FF_ENCODER_HEVC_NVENC } from "node-av/constants";
import { buildAlphaChannelInfoSEI, buildUnifiedExtradata, interleaveAccessUnits } from "./alpha";
import type { FormatMuxer } from "./muxer";
import { splitNalUnits } from "./nal";
import { makePacket, openVideoCtx } from "./misc";
import type { HwVideoEncoderOptions } from "./videotoolbox";

interface NvencState {
  baseCtx: CodecContext;
  alphaCtx: CodecContext;
  basePkt: Packet;
  alphaPkt: Packet;
  stream: Stream;
}

export class NvencDualLayerEncoder implements Disposable {
  private _s: NvencState;
  private _seiBuffer: Buffer;
  private _pts = 0n;
  private _seiInjected = false;
  private _alphaBuf?: Buffer;
  private _alphaFrame?: Frame;

  private constructor(s: NvencState) {
    this._s = s;
    this._seiBuffer = buildAlphaChannelInfoSEI();
  }

  static async create(opts: HwVideoEncoderOptions): Promise<NvencDualLayerEncoder> {
    const { width, height, fps, bitrate, muxer } = opts;

    const codec = Codec.findEncoderByName(FF_ENCODER_HEVC_NVENC);
    if (!codec) throw new Error("hevc_nvenc encoder not found");

    const nvencOpts = { preset: "p4", bf: "0" };
    const common = { codec, width, height, fps, bitrate, options: nvencOpts };
    // BGRA direct — NVENC converts internally, no SWS needed
    const baseCtx = await openVideoCtx({ ...common, pixelFormat: AV_PIX_FMT_BGRA }, "nvenc.base.open2");
    // Alpha as YUV420P — matching bitrate/GOP for compatible SPS across layers
    const alphaCtx = await openVideoCtx({ ...common, pixelFormat: AV_PIX_FMT_YUV420P }, "nvenc.alpha.open2");

    const basePkt = makePacket();
    const alphaPkt = makePacket();

    const stream = muxer.addStream(baseCtx, "hvc1");

    const baseExtra = baseCtx.extraData;
    const alphaExtra = alphaCtx.extraData;
    if (baseExtra && alphaExtra) {
      stream.codecpar.extradata = buildUnifiedExtradata({
        baseExtradata: baseExtra,
        alphaExtradata: alphaExtra,
        width,
        height,
      });
    }

    return new NvencDualLayerEncoder({ baseCtx, alphaCtx, basePkt, alphaPkt, stream });
  }

  async encode(bgraFrame: Frame, muxer: FormatMuxer): Promise<void> {
    const { baseCtx, alphaCtx } = this._s;
    const pts = this._pts++;

    bgraFrame.pts = pts;
    bgraFrame.duration = 1n;
    FFmpegError.throwIfError(await baseCtx.sendFrame(bgraFrame), "base.sendFrame");

    // Alpha: extract alpha channel → YUV420P
    const src = bgraFrame.data?.[0];
    const srcLs = bgraFrame.linesize?.[0];
    if (!src || !srcLs) throw new Error("encode: missing BGRA data");
    const w = bgraFrame.width;
    const h = bgraFrame.height;
    const ySize = w * h;
    const uvSize = (w >> 1) * (h >> 1);
    if (!this._alphaBuf) this._alphaBuf = Buffer.alloc(ySize + uvSize * 2);
    const buf = this._alphaBuf;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        buf[y * w + x] = src[y * srcLs + x * 4 + 3]!;
      }
    }
    buf.fill(128, ySize, ySize + uvSize * 2);

    this._alphaFrame?.free();
    this._alphaFrame = Frame.fromVideoBuffer(buf, { format: AV_PIX_FMT_YUV420P, width: w, height: h });
    this._alphaFrame.pts = pts;
    this._alphaFrame.duration = 1n;
    FFmpegError.throwIfError(await alphaCtx.sendFrame(this._alphaFrame), "alpha.sendFrame");

    await this.drainInterleaved(muxer);
  }

  async flush(muxer: FormatMuxer): Promise<void> {
    await this._s.baseCtx.sendFrame(null);
    await this._s.alphaCtx.sendFrame(null);
    await this.drainInterleaved(muxer);
  }

  [Symbol.dispose](): void {
    const { basePkt, alphaPkt, baseCtx, alphaCtx } = this._s;
    basePkt.free();
    alphaPkt.free();
    this._alphaFrame?.free();
    baseCtx.freeContext();
    alphaCtx.freeContext();
  }

  private async drainInterleaved(muxer: FormatMuxer): Promise<void> {
    const { baseCtx, alphaCtx, basePkt, alphaPkt, stream } = this._s;
    while (true) {
      const baseR = await baseCtx.receivePacket(basePkt);
      const alphaR = await alphaCtx.receivePacket(alphaPkt);

      const baseReady = baseR >= 0;
      const alphaReady = alphaR >= 0;
      if (!baseReady && !alphaReady) break;

      // Both must produce packets together (bf=0 ensures this)
      if (baseReady !== alphaReady) {
        throw new Error(`NVENC desync: base=${baseReady}, alpha=${alphaReady}`);
      }

      const baseNals = splitNalUnits(basePkt.data!);
      const alphaNals = splitNalUnits(alphaPkt.data!);

      const chunks: Buffer[] = [];
      if (!this._seiInjected) {
        chunks.push(this._seiBuffer);
        this._seiInjected = true;
      }
      chunks.push(interleaveAccessUnits(baseNals, alphaNals));

      // Save timestamps before data replacement (setter may reset them)
      const pts = basePkt.pts;
      const dts = basePkt.dts;
      const duration = basePkt.duration;
      basePkt.data = Buffer.concat(chunks);
      basePkt.pts = pts;
      basePkt.dts = dts;
      basePkt.duration = duration === 0n ? 1n : duration;
      basePkt.streamIndex = stream.index;
      basePkt.rescaleTs(baseCtx.timeBase, stream.timeBase);
      await muxer.writePacket(basePkt);

      basePkt.unref();
      alphaPkt.unref();
    }
  }
}
