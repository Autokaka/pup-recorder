// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/12.

import {
  Codec,
  CodecContext,
  FFmpegError,
  Frame,
  HardwareFramesContext,
  Rational,
  SoftwareScaleContext,
  SWS_BILINEAR,
  type Packet,
  type Stream,
} from "node-av";
import {
  AV_CODEC_FLAG_GLOBAL_HEADER,
  AV_PIX_FMT_BGRA,
  AV_PIX_FMT_CUDA,
  AV_PIX_FMT_YUV420P,
  AVCOL_RANGE_JPEG,
  FF_ENCODER_HEVC_NVENC,
} from "node-av/constants";
import { buildAlphaChannelInfoSEI, buildUnifiedExtradata, interleaveAccessUnits } from "./alpha";
import type { FormatMuxer } from "./muxer";
import { splitNalUnits } from "./nal";
import { makeFrame, makePacket } from "./shared";
import type { HwVideoEncoderOptions } from "./videotoolbox";

interface NvencState {
  baseCtx: CodecContext;
  alphaCtx: CodecContext;
  basePkt: Packet;
  alphaPkt: Packet;
  stream: Stream;
  baseSws: SoftwareScaleContext;
  yuvFrame: Frame;
  hwFramesCtx: HardwareFramesContext;
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
    const { width, height, fps, bitrate, hw, muxer } = opts;

    const codec = Codec.findEncoderByName(FF_ENCODER_HEVC_NVENC);
    if (!codec) throw new Error("hevc_nvenc encoder not found");

    const hwFramesCtx = new HardwareFramesContext();
    hwFramesCtx.alloc(hw.deviceContext);
    hwFramesCtx.format = AV_PIX_FMT_CUDA;
    hwFramesCtx.swFormat = AV_PIX_FMT_YUV420P; // NVENC only accepts YUV420P/NV12, not BGRA
    hwFramesCtx.width = width;
    hwFramesCtx.height = height;
    hwFramesCtx.initialPoolSize = 20;
    FFmpegError.throwIfError(hwFramesCtx.init(), "hwFramesCtx.init");

    const makeCtx = async (ctxOpts: { br: number; fullRange?: boolean; cqp?: number }) => {
      const ctx = new CodecContext();
      ctx.allocContext3(codec);
      ctx.codecId = codec.id;
      ctx.width = width;
      ctx.height = height;
      ctx.pixelFormat = AV_PIX_FMT_CUDA;
      if (ctxOpts.fullRange) ctx.colorRange = AVCOL_RANGE_JPEG;
      ctx.timeBase = new Rational(1, fps);
      ctx.framerate = new Rational(fps, 1);
      ctx.gopSize = fps * 2;
      ctx.setFlags(AV_CODEC_FLAG_GLOBAL_HEADER);
      ctx.setOption("preset", "p4");
      ctx.setOption("bf", "0"); // no B-frames — keep base+alpha packet output in sync
      if (ctxOpts.cqp !== undefined) {
        ctx.setOption("rc", "constqp");
        ctx.setOption("qp", String(ctxOpts.cqp));
      } else {
        ctx.bitRate = BigInt(ctxOpts.br);
      }
      ctx.hwFramesCtx = hwFramesCtx;
      FFmpegError.throwIfError(await ctx.open2(codec, null), "nvenc.open2");
      return ctx;
    };

    const baseCtx = await makeCtx({ br: bitrate });
    const alphaCtx = await makeCtx({ br: bitrate, fullRange: true, cqp: 1 });

    const basePkt = makePacket();
    const alphaPkt = makePacket();

    const stream = muxer.addStream(baseCtx, "hvc1");

    const baseExtra = baseCtx.extraData;
    const alphaExtra = alphaCtx.extraData;
    if (baseExtra && alphaExtra) {
      stream.codecpar.extradata = buildUnifiedExtradata(baseExtra, alphaExtra);
    }

    const baseSws = new SoftwareScaleContext();
    baseSws.getContext(width, height, AV_PIX_FMT_BGRA, width, height, AV_PIX_FMT_YUV420P, SWS_BILINEAR);
    return new NvencDualLayerEncoder({
      baseCtx,
      alphaCtx,
      basePkt,
      alphaPkt,
      stream,
      baseSws,
      yuvFrame: makeFrame(width, height, AV_PIX_FMT_YUV420P),
      hwFramesCtx,
    });
  }

  async encode(bgraFrame: Frame, muxer: FormatMuxer): Promise<void> {
    const { baseCtx, alphaCtx, baseSws, yuvFrame, hwFramesCtx } = this._s;
    const pts = this._pts++;

    // Base: BGRA → SWS → YUV420P sw frame
    FFmpegError.throwIfError(yuvFrame.makeWritable(), "yuv.makeWritable");
    FFmpegError.throwIfError(await baseSws.scaleFrame(yuvFrame, bgraFrame), "sws.base");

    // Alpha: extract alpha channel → YUV420P sw frame (Buffer.copy pattern from hw-encode.ts)
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

    // fromVideoBuffer is the only way to set native frame data on Linux
    this._alphaFrame?.free();
    this._alphaFrame = Frame.fromVideoBuffer(buf, { format: AV_PIX_FMT_YUV420P, width: w, height: h });

    // Upload both to GPU + encode
    const baseHwFrame = new Frame();
    baseHwFrame.alloc();
    FFmpegError.throwIfError(hwFramesCtx.getBuffer(baseHwFrame, 0), "base.getBuffer");
    FFmpegError.throwIfError(await hwFramesCtx.transferData(baseHwFrame, yuvFrame, 0), "base.transfer");
    baseHwFrame.pts = pts;
    baseHwFrame.duration = 1n;

    const alphaHwFrame = new Frame();
    alphaHwFrame.alloc();
    FFmpegError.throwIfError(hwFramesCtx.getBuffer(alphaHwFrame, 0), "alpha.getBuffer");
    FFmpegError.throwIfError(await hwFramesCtx.transferData(alphaHwFrame, this._alphaFrame, 0), "alpha.transfer");
    alphaHwFrame.pts = pts;
    alphaHwFrame.duration = 1n;

    FFmpegError.throwIfError(await baseCtx.sendFrame(baseHwFrame), "base.sendFrame");
    FFmpegError.throwIfError(await alphaCtx.sendFrame(alphaHwFrame), "alpha.sendFrame");
    await this.drainInterleaved(muxer);
    baseHwFrame.free();
    alphaHwFrame.free();
  }

  async flush(muxer: FormatMuxer): Promise<void> {
    await this._s.baseCtx.sendFrame(null);
    await this._s.alphaCtx.sendFrame(null);
    await this.drainInterleaved(muxer);
  }

  [Symbol.dispose](): void {
    const { basePkt, alphaPkt, yuvFrame, baseSws, hwFramesCtx, baseCtx, alphaCtx } = this._s;
    basePkt.free();
    alphaPkt.free();
    yuvFrame[Symbol.dispose]();
    this._alphaFrame?.free();
    baseSws[Symbol.dispose]();
    hwFramesCtx.free();
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
