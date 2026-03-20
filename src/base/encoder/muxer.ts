import { CodecContext, FFmpegError, FormatContext, Packet } from "node-av";

export class FormatMuxer {
  private readonly _ctx: FormatContext;
  private _opened = false;

  constructor(outPath: string) {
    this._ctx = new FormatContext();
    FFmpegError.throwIfError(this._ctx.allocOutputContext2(null, null, outPath), "allocOutputContext2");
  }

  addStream(codecCtx: CodecContext, codecTag?: string): ReturnType<FormatContext["newStream"]> {
    const stream = this._ctx.newStream(null);
    stream.timeBase = codecCtx.timeBase;
    FFmpegError.throwIfError(stream.codecpar.fromContext(codecCtx), "codecpar.fromContext");
    if (codecTag) stream.codecpar.codecTag = codecTag;
    return stream;
  }

  async open(): Promise<void> {
    if (this._opened) return;
    FFmpegError.throwIfError(await this._ctx.openOutput(), "openOutput");
    FFmpegError.throwIfError(await this._ctx.writeHeader(null), "writeHeader");
    this._opened = true;
  }

  async writePacket(pkt: Packet): Promise<void> {
    FFmpegError.throwIfError(await this._ctx.interleavedWriteFrame(pkt), "interleavedWriteFrame");
  }

  async finish(): Promise<void> {
    if (!this._opened) return;
    await this._ctx.writeTrailer();
    await this._ctx.closeOutput();
    this._opened = false;
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.finish();
    await this._ctx[Symbol.asyncDispose]();
  }
}
