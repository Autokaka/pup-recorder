// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/12.

import { Codec, type CodecContext, FFmpegError, Frame, type Packet, type Stream } from "node-av";
import { AV_PIX_FMT_BGRA, AV_PIX_FMT_YUV420P, FF_ENCODER_HEVC_NVENC } from "node-av/constants";
import { makeFrame, makePacket, openVideoCtx } from "../misc";
import type { FormatMuxer } from "../muxer";
import type { HwVideoEncoderOptions } from "../videotoolbox";
import { buildUnifiedExtradata, extractAlphaToYuv420pBuffer, interleaveAccessUnits } from "./alpha";
import { patchHevcAlphaPtl } from "./alpha_darwin";
import { splitNalUnits } from "./nal";
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
  private _pts = 0n;

  private constructor(s: NvencState) {
    this._s = s;
  }

  static async create(opts: HwVideoEncoderOptions): Promise<NvencDualLayerEncoder> {
    const { width, height, fps, bitrate, muxer } = opts;

    const codec = Codec.findEncoderByName(FF_ENCODER_HEVC_NVENC);
    if (!codec) throw new Error("hevc_nvenc encoder not found");

    // tier=main matches Apple VideoToolbox; macOS Chrome requires Main tier for HEVC alpha decode.
    const nvencOpts = { preset: "p4", bf: "0", tier: "main" };
    const common = { codec, width, height, fps, bitrate, options: nvencOpts };
    // BGRA direct — NVENC converts internally, no CPU SWS, no hwFramesCtx needed.
    const baseCtx = await openVideoCtx({ ...common, pixelFormat: AV_PIX_FMT_BGRA }, "nvenc.base.open2");
    const alphaCtx = await openVideoCtx({ ...common, pixelFormat: AV_PIX_FMT_YUV420P }, "nvenc.alpha.open2");

    if (!baseCtx.extraData || !alphaCtx.extraData) throw new Error("nvenc: codec extradata missing");
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
      hevcCfg,
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

      // Alpha SEI lives only in extradata (matches x265 ENABLE_ALPHA); duplicate in-band SEI confuses VTB.
      // Patch in-band VPS/SPS PTL bits for Apple-VTB compat (encoder repeats headers per IDR).
      const interleaved = interleaveAccessUnits(splitNalUnits(basePkt.data!), splitNalUnits(alphaPkt.data!), this._s.hevcCfg);
      const chunks = [patchHevcAlphaPtl(interleaved)];

      // basePkt.data setter clears pts/dts/duration/flags.
      // Flags carry AV_PKT_FLAG_KEY — without it mov muxer omits stss, breaks QuickLook thumbnail + seek.
      const pts = basePkt.pts;
      const dts = basePkt.dts;
      const duration = basePkt.duration;
      const flags = basePkt.flags;
      basePkt.data = Buffer.concat(chunks);
      basePkt.pts = pts;
      basePkt.dts = dts;
      basePkt.duration = duration === 0n ? 1n : duration;
      basePkt.flags = flags;
      basePkt.streamIndex = stream.index;
      basePkt.rescaleTs(baseCtx.timeBase, stream.timeBase);
      await muxer.writePacket(basePkt);

      basePkt.unref();
      alphaPkt.unref();
    }
  }
}
