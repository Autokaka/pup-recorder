// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/12.

import {
  Codec,
  type CodecContext,
  FFmpegError,
  Frame,
  HardwareFramesContext,
  type Packet,
  SoftwareScaleContext,
  SWS_BILINEAR,
  type Stream,
} from "node-av";
import { AV_PIX_FMT_BGRA, AV_PIX_FMT_CUDA, AV_PIX_FMT_YUV420P, FF_ENCODER_HEVC_NVENC } from "node-av/constants";
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
  baseSws: SoftwareScaleContext;
  baseSwFrame: Frame;
  alphaSwFrame: Frame;
  alphaBuf: Buffer;
  hwFramesCtx: HardwareFramesContext;
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
    const { width, height, fps, bitrate, hw, muxer } = opts;

    const codec = Codec.findEncoderByName(FF_ENCODER_HEVC_NVENC);
    if (!codec) throw new Error("hevc_nvenc encoder not found");

    // pool=4: bf=0 means 1 in-flight per stream, ×2 streams, ×2 slack.
    const hwFramesCtx = new HardwareFramesContext();
    hwFramesCtx.alloc(hw.deviceContext);
    hwFramesCtx.format = AV_PIX_FMT_CUDA;
    hwFramesCtx.swFormat = AV_PIX_FMT_YUV420P;
    hwFramesCtx.width = width;
    hwFramesCtx.height = height;
    hwFramesCtx.initialPoolSize = 4;
    FFmpegError.throwIfError(hwFramesCtx.init(), "hwFramesCtx.init");

    const common = {
      codec,
      width,
      height,
      fps,
      bitrate,
      pixelFormat: AV_PIX_FMT_CUDA,
      options: { preset: "p4", bf: "0" },
      hwFramesCtx,
    };
    const baseCtx = await openVideoCtx(common, "nvenc.base.open2");
    const alphaCtx = await openVideoCtx(common, "nvenc.alpha.open2");

    const stream = muxer.addStream(baseCtx, "hvc1");
    if (baseCtx.extraData && alphaCtx.extraData) {
      stream.codecpar.extradata = buildUnifiedExtradata({
        baseExtradata: baseCtx.extraData,
        alphaExtradata: alphaCtx.extraData,
        width,
        height,
      });
    }

    const baseSws = new SoftwareScaleContext();
    baseSws.getContext(width, height, AV_PIX_FMT_BGRA, width, height, AV_PIX_FMT_YUV420P, SWS_BILINEAR);

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
      baseSws,
      baseSwFrame: makeFrame(width, height, AV_PIX_FMT_YUV420P),
      alphaSwFrame: makeFrame(width, height, AV_PIX_FMT_YUV420P),
      alphaBuf,
      hwFramesCtx,
    });
  }

  async encode(bgraFrame: Frame, muxer: FormatMuxer): Promise<void> {
    const { baseCtx, alphaCtx, baseSws, baseSwFrame, alphaSwFrame, alphaBuf, hwFramesCtx } = this._s;
    const pts = this._pts++;

    FFmpegError.throwIfError(baseSwFrame.makeWritable(), "baseSw.makeWritable");
    FFmpegError.throwIfError(await baseSws.scaleFrame(baseSwFrame, bgraFrame), "sws.base");
    baseSwFrame.pts = pts;
    baseSwFrame.duration = 1n;
    using baseHwFrame = this.allocHwFrame();
    FFmpegError.throwIfError(await hwFramesCtx.transferData(baseHwFrame, baseSwFrame, 0), "base.transfer");
    baseHwFrame.pts = pts;
    baseHwFrame.duration = 1n;

    // Electron: frame.data[] is a copy, writes discarded. fromBuffer goes native.
    extractAlphaToYuv420pBuffer(bgraFrame, alphaBuf);
    FFmpegError.throwIfError(alphaSwFrame.makeWritable(), "alphaSw.makeWritable");
    FFmpegError.throwIfError(alphaSwFrame.fromBuffer(alphaBuf), "alphaSw.fromBuffer");
    alphaSwFrame.pts = pts;
    alphaSwFrame.duration = 1n;
    using alphaHwFrame = this.allocHwFrame();
    FFmpegError.throwIfError(await hwFramesCtx.transferData(alphaHwFrame, alphaSwFrame, 0), "alpha.transfer");
    alphaHwFrame.pts = pts;
    alphaHwFrame.duration = 1n;

    FFmpegError.throwIfError(await baseCtx.sendFrame(baseHwFrame), "base.sendFrame");
    FFmpegError.throwIfError(await alphaCtx.sendFrame(alphaHwFrame), "alpha.sendFrame");
    await this.drainInterleaved(muxer);
  }

  async flush(muxer: FormatMuxer): Promise<void> {
    await this._s.baseCtx.sendFrame(null);
    await this._s.alphaCtx.sendFrame(null);
    await this.drainInterleaved(muxer);
  }

  [Symbol.dispose](): void {
    const { basePkt, alphaPkt, baseCtx, alphaCtx, baseSws, baseSwFrame, alphaSwFrame, hwFramesCtx } = this._s;
    basePkt.free();
    alphaPkt.free();
    baseSwFrame.free();
    alphaSwFrame.free();
    baseSws[Symbol.dispose]();
    baseCtx.freeContext();
    alphaCtx.freeContext();
    hwFramesCtx.free();
  }

  private allocHwFrame(): Frame {
    const f = new Frame();
    f.alloc();
    FFmpegError.throwIfError(this._s.hwFramesCtx.getBuffer(f, 0), "hw.getBuffer");
    return f;
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
