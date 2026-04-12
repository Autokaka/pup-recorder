// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/12.

import { CodecContext, FFmpegError, Frame, Packet, type Stream } from "node-av";
import { AVERROR_EAGAIN, AVERROR_EOF, type AVPixelFormat } from "node-av/constants";
import type { FormatMuxer } from "./muxer";

export function makeFrame(width: number, height: number, pixFmt: AVPixelFormat): Frame {
  const frame = new Frame();
  frame.alloc();
  frame.format = pixFmt;
  frame.width = width;
  frame.height = height;
  FFmpegError.throwIfError(frame.getBuffer(0), "frame.getBuffer");
  return frame;
}

export function makePacket(): Packet {
  const pkt = new Packet();
  pkt.alloc();
  return pkt;
}

export async function drainPackets(ctx: CodecContext, pkt: Packet, stream: Stream, muxer: FormatMuxer): Promise<void> {
  while (true) {
    const r = await ctx.receivePacket(pkt);
    if (r === AVERROR_EAGAIN || r === AVERROR_EOF) break;
    FFmpegError.throwIfError(r, "receivePacket");
    pkt.streamIndex = stream.index;
    if (pkt.duration === 0n) pkt.duration = 1n;
    pkt.rescaleTs(ctx.timeBase, stream.timeBase);
    await muxer.writePacket(pkt);
    pkt.unref();
  }
}
