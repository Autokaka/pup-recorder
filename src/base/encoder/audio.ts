// Created by Autokaka (qq1909698494@gmail.com) on 2026/03/21.

import {
  Codec,
  CodecContext,
  FFmpegError,
  Filter,
  FilterGraph,
  FilterInOut,
  Frame,
  Packet,
  Rational,
  type FilterContext,
} from "node-av";
import {
  AV_CHANNEL_LAYOUT_STEREO,
  AV_CODEC_FLAG_GLOBAL_HEADER,
  AV_SAMPLE_FMT_FLT,
  AV_SAMPLE_FMT_FLTP,
  AVERROR_EAGAIN,
  AVERROR_EOF,
  type FFAudioEncoder,
} from "node-av/constants";
import type { FormatMuxer } from "./muxer";

const SAMPLE_FMT_NAME: Partial<Record<number, string>> = {
  [AV_SAMPLE_FMT_FLT]: "flt",
  [AV_SAMPLE_FMT_FLTP]: "fltp",
};

export interface AudioEncoderOptions {
  outSampleRate: number;
  outSampleFmt: typeof AV_SAMPLE_FMT_FLT | typeof AV_SAMPLE_FMT_FLTP;
  codecName: FFAudioEncoder;
  globalHeader: boolean;
  bitrate: number;
  muxer: FormatMuxer;
}

type Stream = ReturnType<import("node-av").FormatContext["newStream"]>;

export class AudioEncoder implements Disposable {
  private readonly _ctx: CodecContext;
  private readonly _stream: Stream;
  private readonly _outRate: number;
  private readonly _outFmt: typeof AV_SAMPLE_FMT_FLT | typeof AV_SAMPLE_FMT_FLTP;
  private readonly _frameSize: number;
  private readonly _pkt: Packet;
  private readonly _filterFrame: Frame;

  private _graph?: FilterGraph;
  private _bufSrc?: FilterContext;
  private _bufSink?: FilterContext;
  private _inRate?: number;
  private _pts = 0n;

  private constructor(ctx: CodecContext, stream: Stream, outFmt: typeof AV_SAMPLE_FMT_FLT | typeof AV_SAMPLE_FMT_FLTP) {
    this._ctx = ctx;
    this._stream = stream;
    this._outRate = ctx.sampleRate;
    this._outFmt = outFmt;
    this._frameSize = ctx.frameSize;
    this._pkt = new Packet();
    this._pkt.alloc();
    this._filterFrame = new Frame();
    this._filterFrame.alloc();
  }

  static async create(opts: AudioEncoderOptions): Promise<AudioEncoder> {
    const { outSampleRate, outSampleFmt, codecName, globalHeader, bitrate, muxer } = opts;

    const codec = Codec.findEncoderByName(codecName);
    if (!codec) throw new Error(`Audio encoder not found: ${codecName}`);

    const ctx = new CodecContext();
    ctx.allocContext3(codec);
    ctx.codecId = codec.id;
    ctx.sampleFormat = outSampleFmt;
    ctx.sampleRate = outSampleRate;
    ctx.channelLayout = AV_CHANNEL_LAYOUT_STEREO;
    ctx.timeBase = new Rational(1, outSampleRate);
    ctx.bitRate = BigInt(bitrate);
    if (globalHeader) ctx.setFlags(AV_CODEC_FLAG_GLOBAL_HEADER);
    FFmpegError.throwIfError(await ctx.open2(codec, null), "audioCtx.open2");

    const stream = muxer.addStream(ctx);
    return new AudioEncoder(ctx, stream, outSampleFmt);
  }

  /** Must be called once when the page's actual sample rate is known. */
  setInputRate(inSampleRate: number): void {
    this.disposeGraph();
    this._inRate = inSampleRate;

    const graph = new FilterGraph();
    graph.alloc();

    const abuffer = Filter.getByName("abuffer")!;
    const srcArgs = `sample_rate=${inSampleRate}:sample_fmt=flt:channel_layout=stereo:time_base=1/${inSampleRate}`;
    const bufSrc = graph.createFilter(abuffer, "src", srcArgs);
    if (!bufSrc) throw new Error("Failed to create abuffer");

    const abuffersink = Filter.getByName("abuffersink")!;
    const bufSink = graph.createFilter(abuffersink, "sink");
    if (!bufSink) throw new Error("Failed to create abuffersink");

    const fmtName = SAMPLE_FMT_NAME[this._outFmt] ?? "flt";
    const filterDesc = `aformat=sample_fmts=${fmtName}:sample_rates=${this._outRate}:channel_layouts=stereo,asetnsamples=n=${this._frameSize}:p=1`;
    const outputs = FilterInOut.createList([{ name: "in", filterCtx: bufSrc, padIdx: 0 }]);
    const inputs = FilterInOut.createList([{ name: "out", filterCtx: bufSink, padIdx: 0 }]);
    FFmpegError.throwIfError(graph.parsePtr(filterDesc, inputs, outputs), "graph.parsePtr");
    FFmpegError.throwIfError(graph.configSync(), "graph.config");

    this._graph = graph;
    this._bufSrc = bufSrc;
    this._bufSink = bufSink;
  }

  async encode(pcm: Buffer, muxer: FormatMuxer): Promise<void> {
    if (!this._bufSrc || !this._inRate) return;

    const src = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.byteLength / 4);
    for (let i = 0; i < src.length; i++) {
      if (!isFinite(src[i]!)) src[i] = 0;
    }
    const nSamples = src.length >> 1;

    using frame = Frame.fromAudioBuffer(Buffer.from(src.buffer, src.byteOffset, src.byteLength), {
      nbSamples: nSamples,
      format: AV_SAMPLE_FMT_FLT,
      sampleRate: this._inRate,
      channelLayout: AV_CHANNEL_LAYOUT_STEREO,
      pts: this._pts,
      timeBase: { num: 1, den: this._inRate },
    });
    this._pts += BigInt(nSamples);

    FFmpegError.throwIfError(await this._bufSrc.buffersrcAddFrame(frame), "buffersrcAddFrame");
    await this.drainFilter(muxer);
  }

  async flush(muxer: FormatMuxer): Promise<void> {
    if (this._bufSrc) {
      await this._bufSrc.buffersrcAddFrame(null);
      await this.drainFilter(muxer);
    }
    await this._ctx.sendFrame(null);
    await this.drainCodec(muxer);
  }

  [Symbol.dispose](): void {
    this._pkt.free();
    this._filterFrame.free();
    this.disposeGraph();
    this._ctx.freeContext();
  }

  private async drainFilter(muxer: FormatMuxer): Promise<void> {
    const outFrame = this._filterFrame;
    while (true) {
      const r = await this._bufSink!.buffersinkGetFrame(outFrame);
      if (r === AVERROR_EAGAIN || r === AVERROR_EOF) break;
      FFmpegError.throwIfError(r, "buffersinkGetFrame");
      FFmpegError.throwIfError(await this._ctx.sendFrame(outFrame), "audioCtx.sendFrame");
      outFrame.unref();
      await this.drainCodec(muxer);
    }
  }

  private async drainCodec(muxer: FormatMuxer): Promise<void> {
    const pkt = this._pkt;
    while (true) {
      const r = await this._ctx.receivePacket(pkt);
      if (r === AVERROR_EAGAIN || r === AVERROR_EOF) break;
      FFmpegError.throwIfError(r, "audio.receivePacket");
      pkt.streamIndex = this._stream.index;
      pkt.rescaleTs(this._ctx.timeBase, this._stream.timeBase);
      await muxer.writePacket(pkt);
      pkt.unref();
    }
  }

  private disposeGraph(): void {
    this._graph?.[Symbol.dispose]();
    this._graph = undefined;
    this._bufSrc = undefined;
    this._bufSink = undefined;
  }
}
