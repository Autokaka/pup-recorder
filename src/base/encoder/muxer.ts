// Created by Autokaka (qq1909698494@gmail.com) on 2026/03/21.

import { type CodecContext, Dictionary, FFmpegError, FormatContext, type Packet, type Stream } from "node-av";

export class FormatMuxer {
  private readonly _ctx: FormatContext;
  private _opened = false;
  private _disposed = false;

  constructor(outPath: string, formatName?: string) {
    this._ctx = new FormatContext();
    FFmpegError.throwIfError(this._ctx.allocOutputContext2(null, formatName ?? null, outPath), "allocOutputContext2");
  }

  addStream(codecCtx: CodecContext, codecTag?: string): Stream {
    const stream = this._ctx.newStream(null);
    stream.timeBase = codecCtx.timeBase;
    FFmpegError.throwIfError(stream.codecpar.fromContext(codecCtx), "codecpar.fromContext");
    if (codecTag) {
      stream.codecpar.codecTag = codecTag;
    }
    return stream;
  }

  async open(): Promise<void> {
    if (this._opened) {
      return;
    }
    FFmpegError.throwIfError(await this._ctx.openOutput(), "openOutput");
    // +faststart relocates moov to file front on writeTrailer so players can begin playback before full download.
    using opts = Dictionary.fromObject({ movflags: "+faststart" });
    FFmpegError.throwIfError(await this._ctx.writeHeader(opts), "writeHeader");
    this._opened = true;
  }

  async writePacket(pkt: Packet): Promise<void> {
    FFmpegError.throwIfError(await this._ctx.interleavedWriteFrame(pkt), "interleavedWriteFrame");
  }

  async [Symbol.asyncDispose](): Promise<void> {
    if (this._disposed) {
      return;
    }
    this._disposed = true;
    try {
      if (this._opened) {
        this._opened = false;
        try {
          await this._ctx.writeTrailer();
        } finally {
          // A failed/truncated trailer write must not leak the FD.
          await this._ctx.closeOutput();
        }
      }
    } finally {
      // Always free the native context — even a never-opened muxer allocated one in the constructor.
      await this._ctx[Symbol.asyncDispose]();
    }
  }
}
