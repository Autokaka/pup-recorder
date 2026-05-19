// Created by Lu Ao (luao@bilibili.com) on 2026/05/18.

import { type CodecContext, FFmpegError, type Packet, type Stream } from "node-av";
import { AVERROR_EAGAIN, AVERROR_EOF, type AVPacketFlag } from "node-av/constants";
import type { FormatMuxer } from "../muxer";
import { interleaveAccessUnits } from "./alpha";
import { patchHevcAlphaPtl } from "./alpha_darwin";
import { splitNalUnits } from "./nal";
import type { NvencHevcConfig } from "./parser";

interface PendingPacket {
  data: Buffer;
  pts: bigint;
  dts: bigint;
  duration: bigint;
  flags: AVPacketFlag;
}

export interface DualLayerMuxOptions {
  baseCtx: CodecContext;
  alphaCtx: CodecContext;
  basePkt: Packet;
  alphaPkt: Packet;
  stream: Stream;
  hevcCfg: NvencHevcConfig;
}

// Drains the base + alpha NVENC sessions and writes interleaved HEVC-alpha access units.
export class DualLayerMux {
  private _s: DualLayerMuxOptions;
  private _baseQueue: PendingPacket[] = [];
  private _alphaQueue: PendingPacket[] = [];

  constructor(s: DualLayerMuxOptions) {
    this._s = s;
  }

  async drain(muxer: FormatMuxer): Promise<void> {
    const { baseCtx, alphaCtx, basePkt, alphaPkt } = this._s;
    // Drain each session fully — independent NVENC sessions run a frame apart transiently.
    this._baseQueue.push(...(await this.receiveAll(baseCtx, basePkt, "base")));
    this._alphaQueue.push(...(await this.receiveAll(alphaCtx, alphaPkt, "alpha")));
    // bf=0 → no reorder; queue index N is the same frame for both. Leftover waits for next drain.
    while (this._baseQueue.length && this._alphaQueue.length) {
      await this.writePair(this._baseQueue.shift()!, this._alphaQueue.shift()!, muxer);
    }
  }

  // Unpaired leftovers after EOF = true base/alpha desync; returns a description, else undefined.
  desyncAfterEof(): string | undefined {
    if (!this._baseQueue.length && !this._alphaQueue.length) return undefined;
    return `base=${this._baseQueue.length}, alpha=${this._alphaQueue.length} unpaired`;
  }

  // EAGAIN/EOF = normal stop; any other negative is a real fault, not "drained".
  private async receiveAll(ctx: CodecContext, pkt: Packet, tag: string): Promise<PendingPacket[]> {
    const out: PendingPacket[] = [];
    while (true) {
      const ret = await ctx.receivePacket(pkt);
      if (ret >= 0) {
        out.push(this.snapshot(pkt));
        pkt.unref();
        continue;
      }
      if (ret === AVERROR_EAGAIN || ret === AVERROR_EOF) return out;
      FFmpegError.throwIfError(ret, `nvenc.${tag}.receivePacket`);
    }
  }

  private snapshot(pkt: Packet): PendingPacket {
    // pkt.data is native memory freed on unref — copy before queueing.
    return { data: Buffer.from(pkt.data!), pts: pkt.pts, dts: pkt.dts, duration: pkt.duration, flags: pkt.flags };
  }

  private async writePair(base: PendingPacket, alpha: PendingPacket, muxer: FormatMuxer): Promise<void> {
    const { basePkt, baseCtx, stream, hevcCfg } = this._s;
    // Patch in-band VPS/SPS PTL bits for Apple-VTB compat (encoder repeats headers per IDR).
    const interleaved = interleaveAccessUnits(splitNalUnits(base.data), splitNalUnits(alpha.data), hevcCfg);
    // data setter wipes pts/dts/duration/flags — restore; flags' KEY bit drives mov stss.
    basePkt.data = patchHevcAlphaPtl(interleaved);
    basePkt.pts = base.pts;
    basePkt.dts = base.dts;
    basePkt.duration = base.duration === 0n ? 1n : base.duration;
    basePkt.flags = base.flags;
    basePkt.streamIndex = stream.index;
    basePkt.rescaleTs(baseCtx.timeBase, stream.timeBase);
    await muxer.writePacket(basePkt);
    basePkt.unref();
  }
}
