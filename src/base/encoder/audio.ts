// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/01.

import {
  Codec,
  CodecContext,
  FFmpegError,
  Filter,
  FilterContext,
  FilterGraph,
  FilterInOut,
  Frame,
  type Packet,
  Rational,
  type Stream,
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
import { drainPackets, makePacket } from "./shared";

const SAMPLE_FMT_NAME: Partial<Record<number, string>> = { [AV_SAMPLE_FMT_FLT]: "flt", [AV_SAMPLE_FMT_FLTP]: "fltp" };

export interface AudioEncoderOptions {
  outSampleRate: number;
  outSampleFmt: typeof AV_SAMPLE_FMT_FLT | typeof AV_SAMPLE_FMT_FLTP;
  codecName: FFAudioEncoder;
  globalHeader: boolean;
  bitrate: number;
  muxer: FormatMuxer;
}

export class AudioEncoder implements Disposable {
  private _ctx: CodecContext;
  private _stream: Stream;
  private _pkt: Packet;
  private _outRate: number;
  private _outFmt: typeof AV_SAMPLE_FMT_FLT | typeof AV_SAMPLE_FMT_FLTP;
  private _frameSize: number;
  private _filterFrame: Frame;
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
    this._pkt = makePacket();
    this._filterFrame = new Frame();
    this._filterFrame.alloc();
  }

  static async create(opts: AudioEncoderOptions): Promise<AudioEncoder> {
    const codec = Codec.findEncoderByName(opts.codecName);
    if (!codec) throw new Error(`Audio encoder not found: ${opts.codecName}`);
    const ctx = new CodecContext();
    ctx.allocContext3(codec);
    ctx.codecId = codec.id;
    ctx.sampleFormat = opts.outSampleFmt;
    ctx.sampleRate = opts.outSampleRate;
    ctx.channelLayout = AV_CHANNEL_LAYOUT_STEREO;
    ctx.timeBase = new Rational(1, opts.outSampleRate);
    ctx.bitRate = BigInt(opts.bitrate);
    if (opts.globalHeader) ctx.setFlags(AV_CODEC_FLAG_GLOBAL_HEADER);
    FFmpegError.throwIfError(await ctx.open2(codec, null), "audioCtx.open2");
    const stream = opts.muxer.addStream(ctx);
    return new AudioEncoder(ctx, stream, opts.outSampleFmt);
  }

  setInputRate(inSampleRate: number): void {
    this._graph?.[Symbol.dispose]();
    this._inRate = inSampleRate;
    const graph = new FilterGraph();
    graph.alloc();
    const abuffer = Filter.getByName("abuffer")!;
    const bufSrc = graph.createFilter(
      abuffer,
      "src",
      `sample_rate=${inSampleRate}:sample_fmt=flt:channel_layout=stereo:time_base=1/${inSampleRate}`,
    );
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
    for (let i = 0; i < src.length; i++) if (!isFinite(src[i]!)) src[i] = 0;
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
    await this.drain(muxer);
  }

  async flush(muxer: FormatMuxer): Promise<void> {
    if (this._bufSrc) {
      await this._bufSrc.buffersrcAddFrame(null);
      await this.drain(muxer);
    }
    await this._ctx.sendFrame(null);
    await this.drainCodec(muxer);
  }

  [Symbol.dispose](): void {
    this._pkt.free();
    this._filterFrame.free();
    this._graph?.[Symbol.dispose]();
    this._ctx.freeContext();
  }

  private async drain(muxer: FormatMuxer): Promise<void> {
    while (true) {
      const r = await this._bufSink!.buffersinkGetFrame(this._filterFrame);
      if (r === AVERROR_EAGAIN || r === AVERROR_EOF) break;
      FFmpegError.throwIfError(r, "buffersinkGetFrame");
      FFmpegError.throwIfError(await this._ctx.sendFrame(this._filterFrame), "audioCtx.sendFrame");
      this._filterFrame.unref();
      await this.drainCodec(muxer);
    }
  }

  private drainCodec(muxer: FormatMuxer): Promise<void> {
    return drainPackets(this._ctx, this._pkt, this._stream, muxer);
  }
}
