// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/12.

import { Codec, CodecContext, FFmpegError, Frame, Packet, Rational, type Stream } from "node-av";
import {
  AV_CODEC_FLAG_GLOBAL_HEADER,
  AVERROR_EAGAIN,
  AVERROR_EOF,
  type AVColorRange,
  type AVPixelFormat,
} from "node-av/constants";
import type { FormatMuxer } from "./muxer";

export interface VideoCtxOptions {
  codec: Codec;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  pixelFormat: AVPixelFormat;
  codecTag?: string;
  colorRange?: AVColorRange;
  options?: Record<string, string>;
}

export async function openVideoCtx(opts: VideoCtxOptions, label: string): Promise<CodecContext> {
  const ctx = new CodecContext();
  ctx.allocContext3(opts.codec);
  ctx.codecId = opts.codec.id;
  ctx.width = opts.width;
  ctx.height = opts.height;
  ctx.pixelFormat = opts.pixelFormat;
  ctx.timeBase = new Rational(1, opts.fps);
  ctx.framerate = new Rational(opts.fps, 1);
  ctx.gopSize = opts.fps * 2;
  ctx.bitRate = BigInt(opts.bitrate);
  ctx.setFlags(AV_CODEC_FLAG_GLOBAL_HEADER);
  if (opts.codecTag) ctx.codecTag = opts.codecTag;
  if (opts.colorRange !== undefined) ctx.colorRange = opts.colorRange;
  for (const [k, v] of Object.entries(opts.options ?? {})) ctx.setOption(k, v);
  FFmpegError.throwIfError(await ctx.open2(opts.codec, null), label);
  return ctx;
}

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
