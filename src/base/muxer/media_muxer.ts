// Created by Autokaka (qq1909698494@gmail.com) on 2026/03/14.

import type {
  EncodedAudioChunk,
  EncodedAudioChunkMetadataJs,
  EncodedVideoChunk,
  EncodedVideoChunkMetadataJs,
} from "@napi-rs/webcodecs";
import {
  EncodedAudioPacketSource,
  EncodedPacket,
  EncodedVideoPacketSource,
  Output,
  StreamTarget,
  type AudioCodec,
  type OutputFormat,
  type VideoCodec,
} from "mediabunny";
import { open, type FileHandle } from "node:fs/promises";

// StreamTarget passes { data, position } chunks — positional writes let MP4/MOV seek back to
// update moov without buffering all data in RAM.
export const openFileStreamTarget = async (path: string): Promise<StreamTarget> => {
  let handle!: FileHandle;
  return new StreamTarget(
    new WritableStream({
      start: async () => {
        handle = await open(path, "w");
      },
      write: async ({ data, position }: { data: Uint8Array; position: number }) => {
        await handle.write(data, 0, data.byteLength, position);
      },
      close: async () => handle.close(),
      abort: async () => handle.close(),
    }),
  );
};

export interface MuxerOptions {
  width: number;
  height: number;
  fps: number;
  outPath: string;
  withAudio?: boolean;
}

export interface VideoChunk {
  data: Uint8Array;
  alphaSideData?: Uint8Array;
  type: EncodedVideoChunk["type"];
  timestampS: number;
  durationS: number;
}

interface AudioChunk {
  data: Uint8Array;
  type: EncodedAudioChunk["type"];
  timestampS: number;
  durationS: number;
}

export const toPacket = ({ data, type, timestampS, durationS }: VideoChunk | AudioChunk) =>
  new EncodedPacket(data, type, timestampS, durationS);

export abstract class MediaMuxer {
  protected readonly opts: MuxerOptions;
  protected videoDesc?: Uint8Array;

  // Promise chain serializes async muxer writes in the order chunks arrive.
  private _chain: Promise<void>;
  private _videoSrc!: EncodedVideoPacketSource;
  private _audioSrc?: EncodedAudioPacketSource;
  private _output!: Output;
  private _firstVideo = true;
  private _firstAudio = true;

  // Subclasses declare what format/codecs they use via getters.
  protected abstract get format(): OutputFormat;
  protected abstract get videoCodec(): VideoCodec;
  protected abstract get audioCodec(): AudioCodec;
  // audioDecoderCodec is the MIME codec string for the decoder config (e.g. "mp4a.40.2" vs "aac").
  protected abstract get audioDecoderCodec(): string;
  protected abstract get videoConfig(): EncodedVideoChunkMetadata["decoderConfig"];
  protected abstract makeVideoPacket(chunk: VideoChunk, isFirst: boolean): EncodedPacket;

  constructor(opts: MuxerOptions) {
    this.opts = opts;
    this._chain = this.init();
  }

  private async init() {
    const { fps, withAudio, outPath } = this.opts;
    const target = await openFileStreamTarget(outPath);
    const output = new Output({ format: this.format, target });
    const videoSrc = new EncodedVideoPacketSource(this.videoCodec);
    output.addVideoTrack(videoSrc, { frameRate: fps });
    const audioSrc = withAudio ? new EncodedAudioPacketSource(this.audioCodec) : undefined;
    if (audioSrc) output.addAudioTrack(audioSrc);
    await output.start();
    this._output = output;
    this._videoSrc = videoSrc;
    this._audioSrc = audioSrc;
  }

  addVideoChunk(raw: EncodedVideoChunk, meta?: EncodedVideoChunkMetadataJs): void {
    this.videoDesc ??= meta?.decoderConfig?.description;
    const data = new Uint8Array(raw.byteLength);
    raw.copyTo(data);
    const chunk: VideoChunk = {
      data,
      alphaSideData: meta?.alphaSideData,
      type: raw.type,
      timestampS: raw.timestamp / 1e6,
      durationS: (raw.duration ?? 0) / 1e6,
    };
    const isFirst = this._firstVideo;
    this._firstVideo = false;
    this._chain = this._chain.then(() =>
      this._videoSrc.add(
        this.makeVideoPacket(chunk, isFirst),
        isFirst ? { decoderConfig: this.videoConfig } : undefined,
      ),
    );
  }

  addAudioChunk(raw: EncodedAudioChunk, meta?: EncodedAudioChunkMetadataJs): void {
    const audioSrc = this._audioSrc;
    if (!audioSrc) return;
    const data = new Uint8Array(raw.byteLength);
    raw.copyTo(data);
    const chunk: AudioChunk = {
      data,
      type: raw.type,
      timestampS: raw.timestamp / 1e6,
      durationS: (raw.duration ?? 0) / 1e6,
    };
    const isFirst = this._firstAudio;
    this._firstAudio = false;
    const decoderConfig =
      isFirst && meta?.decoderConfig
        ? {
            codec: this.audioDecoderCodec,
            sampleRate: meta.decoderConfig.sampleRate ?? 44100,
            numberOfChannels: meta.decoderConfig.numberOfChannels ?? 2,
            description: meta.decoderConfig.description,
          }
        : undefined;
    this._chain = this._chain.then(() => audioSrc.add(toPacket(chunk), decoderConfig ? { decoderConfig } : undefined));
  }

  async finalize(): Promise<string> {
    if (this._firstVideo) throw new Error(`${this.constructor.name}: no video data`);
    await this._chain;
    this._videoSrc.close();
    this._audioSrc?.close();
    await this._output.finalize();
    return this.opts.outPath;
  }
}
