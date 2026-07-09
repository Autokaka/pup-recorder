// Created by Autokaka (qq1909698494@gmail.com) on 2026/07/06.

import { randomBytes } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Codec, FFmpegError, Frame } from "node-av";
import { AV_PIX_FMT_YUV420P, AVERROR_EAGAIN, AVERROR_EOF } from "node-av/constants";
import { FF_ENCODER_LIBVPX_VP9, makePacket, openVideoCtx } from "../../base/encoder/misc";
import { FormatMuxer } from "../../base/encoder/muxer";

export interface StubEncodeOptions {
  width: number;
  height: number;
  duration: number;
}

// Real parseable media with the source's intrinsic size + duration, so Blink lays out like Chrome.
export async function encodeStubWebm({ width, height, duration }: StubEncodeOptions): Promise<Buffer> {
  const codec = Codec.findEncoderByName(FF_ENCODER_LIBVPX_VP9);
  if (!codec) {
    throw new Error(`stub: encoder not found: ${FF_ENCODER_LIBVPX_VP9}`);
  }
  const path = join(tmpdir(), `pup_stub_${randomBytes(8).toString("hex")}.webm`);
  try {
    {
      await using muxer = new FormatMuxer(path);
      // Timebase 1/1000 (fps param) lets one packet carry the full source duration in ms.
      using ctx = await openVideoCtx(
        {
          codec,
          width,
          height,
          fps: 1000,
          bitrate: 100_000,
          pixelFormat: AV_PIX_FMT_YUV420P,
          options: { deadline: "realtime", "cpu-used": "8" },
        },
        "stubCtx.open2",
      );
      const stream = muxer.addStream(ctx);
      await muxer.open();
      using stub = new StubFrame(width, height);
      const ms = BigInt(Math.max(1, Math.round(duration * 1000)));
      stub.frame.pts = 0n;
      stub.frame.duration = ms;
      FFmpegError.throwIfError(await ctx.sendFrame(stub.frame), "stubCtx.sendFrame");
      FFmpegError.throwIfError(await ctx.sendFrame(null), "stubCtx.flush");
      using pkt = makePacket();
      while (true) {
        const r = await ctx.receivePacket(pkt);
        if (r === AVERROR_EAGAIN || r === AVERROR_EOF) {
          break;
        }
        FFmpegError.throwIfError(r, "stubCtx.receivePacket");
        pkt.streamIndex = stream.index;
        pkt.duration = ms;
        pkt.rescaleTs(ctx.timeBase, stream.timeBase);
        await muxer.writePacket(pkt);
        pkt.unref();
      }
    }
    return await readFile(path);
  } finally {
    await rm(path, { force: true });
  }
}

// Owns the black pixel buffer AND its zero-copy frame view — `using` pins both until after encode.
class StubFrame implements Disposable {
  readonly frame: Frame;
  private readonly _buf: Buffer;

  constructor(width: number, height: number) {
    const luma = width * height;
    const chroma = Math.ceil(width / 2) * Math.ceil(height / 2);
    this._buf = Buffer.alloc(luma + chroma * 2, 0x80);
    this._buf.fill(0, 0, luma);
    this.frame = Frame.fromVideoBuffer(this._buf, { width, height, format: AV_PIX_FMT_YUV420P });
  }

  [Symbol.dispose](): void {
    this.frame[Symbol.dispose]();
  }
}
