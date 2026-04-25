// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/12.

import { Codec, type CodecContext, FFmpegError, Frame, type Packet, type Stream } from "node-av";
import { AV_PIX_FMT_BGRA, AV_PIX_FMT_YUV420P, FF_ENCODER_HEVC_NVENC } from "node-av/constants";
import {
  buildAlphaChannelInfoSEI,
  buildUnifiedExtradata,
  extractAlphaToYuv420pBuffer,
  interleaveAccessUnits,
} from "./alpha";
import type { FormatMuxer } from "./muxer";
import { splitNalUnits } from "./nal";
import { makeFrame, makePacket, openVideoCtx } from "./misc";
import type { HwVideoEncoderOptions } from "./videotoolbox";

interface NvencState {
  baseCtx: CodecContext;
  alphaCtx: CodecContext;
  basePkt: Packet;
  alphaPkt: Packet;
  stream: Stream;
  alphaSwFrame: Frame;
  alphaBuf: Buffer;
}

export class NvencDualLayerEncoder implements Disposable {
  private _s: NvencState;
  private _seiBuffer: Buffer;
  private _pts = 0n;
  private _seiInjected = false;

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
    // BGRA direct — NVENC converts internally, no CPU SWS, no hwFramesCtx needed.
    const baseCtx = await openVideoCtx({ ...common, pixelFormat: AV_PIX_FMT_BGRA }, "nvenc.base.open2");
    const alphaCtx = await openVideoCtx({ ...common, pixelFormat: AV_PIX_FMT_YUV420P }, "nvenc.alpha.open2");

    const stream = muxer.addStream(baseCtx, "hvc1");
    if (baseCtx.extraData && alphaCtx.extraData) {
      stream.codecpar.extradata = buildUnifiedExtradata({
        baseExtradata: baseCtx.extraData,
        alphaExtradata: alphaCtx.extraData,
        width,
        height,
      });
    }

    const ySize = width * height;
    const uvSize = (width >> 1) * (height >> 1);
    const alphaBuf = Buffer.alloc(ySize + uvSize * 2);
    alphaBuf.fill(128, ySize);

    return new NvencDualLayerEncoder({
      baseCtx,
      alphaCtx,
      basePkt: makePacket(),
      alphaPkt: makePacket(),
      stream,
      alphaSwFrame: makeFrame(width, height, AV_PIX_FMT_YUV420P),
      alphaBuf,
    });
  }

  async encode(bgraFrame: Frame, muxer: FormatMuxer): Promise<void> {
    const { baseCtx, alphaCtx, alphaSwFrame, alphaBuf } = this._s;
    const pts = this._pts++;

    bgraFrame.pts = pts;
    bgraFrame.duration = 1n;
    FFmpegError.throwIfError(await baseCtx.sendFrame(bgraFrame), "base.sendFrame");

    // Electron: frame.data[] is a copy, writes discarded. fromBuffer goes native.
    extractAlphaToYuv420pBuffer(bgraFrame, alphaBuf);
    FFmpegError.throwIfError(alphaSwFrame.makeWritable(), "alphaSw.makeWritable");
    FFmpegError.throwIfError(alphaSwFrame.fromBuffer(alphaBuf), "alphaSw.fromBuffer");
    alphaSwFrame.pts = pts;
    alphaSwFrame.duration = 1n;
    FFmpegError.throwIfError(await alphaCtx.sendFrame(alphaSwFrame), "alpha.sendFrame");

    await this.drainInterleaved(muxer);
  }

  async flush(muxer: FormatMuxer): Promise<void> {
    await this._s.baseCtx.sendFrame(null);
    await this._s.alphaCtx.sendFrame(null);
    await this.drainInterleaved(muxer);
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

  private async drainInterleaved(muxer: FormatMuxer): Promise<void> {
    const { baseCtx, alphaCtx, basePkt, alphaPkt, stream } = this._s;
    while (true) {
      const baseR = await baseCtx.receivePacket(basePkt);
      const alphaR = await alphaCtx.receivePacket(alphaPkt);
      const baseReady = baseR >= 0;
      const alphaReady = alphaR >= 0;
      if (!baseReady && !alphaReady) break;
      // bf=0 → both streams emit in lockstep.
      if (baseReady !== alphaReady) throw new Error(`NVENC desync: base=${baseReady}, alpha=${alphaReady}`);

      const chunks: Buffer[] = [];
      if (!this._seiInjected) {
        chunks.push(this._seiBuffer);
        this._seiInjected = true;
      }
      chunks.push(interleaveAccessUnits(splitNalUnits(basePkt.data!), splitNalUnits(alphaPkt.data!)));

      // basePkt.data setter clears pts/dts/duration.
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
