// Created by Autokaka (qq1909698494@gmail.com) on 2026/03/14.

import type {
  EncodedAudioChunk,
  EncodedAudioChunkMetadataJs,
  EncodedVideoChunk,
  EncodedVideoChunkMetadataJs,
} from "@napi-rs/webcodecs";
import { EncodedPacket, StreamTarget } from "mediabunny";
import { open, type FileHandle } from "node:fs/promises";

// StreamTarget passes { data: Uint8Array, position: number } chunks — use positional
// writes so MP4/MOV can seek back to update the moov box without buffering in RAM.
export const openFileStreamTarget = async (path: string): Promise<StreamTarget> => {
  let handle: FileHandle;
  return new StreamTarget(
    new WritableStream({
      start: async () => {
        handle = await open(path, "w");
      },
      write: async (chunk: { data: Uint8Array; position: number }) => {
        await handle.write(chunk.data, 0, chunk.data.byteLength, chunk.position);
      },
      close: async () => await handle.close(),
      abort: async () => await handle.close(),
    }),
  );
};

export interface MuxerOptions {
  width: number;
  height: number;
  fps: number;
  outPath: string;
}

export interface BufferedVideo {
  data: Uint8Array;
  alphaSideData?: Uint8Array;
  type: EncodedVideoChunk["type"];
  timestampS: number;
  durationS: number;
}

export interface BufferedAudio {
  data: Uint8Array;
  type: EncodedAudioChunk["type"];
  timestampS: number;
  durationS: number;
}

export interface AudioInit {
  sampleRate: number;
  numberOfChannels: number;
  description?: Uint8Array;
}

export const toPacket = ({ data, type, timestampS, durationS }: BufferedVideo | BufferedAudio) =>
  new EncodedPacket(data, type, timestampS, durationS);

export abstract class MediaMuxer {
  protected readonly opts: MuxerOptions;
  protected videoChunks: BufferedVideo[] = [];
  protected audioChunks: BufferedAudio[] = [];
  protected videoDesc?: Uint8Array;
  protected audioInit?: AudioInit;

  constructor(opts: MuxerOptions) {
    this.opts = opts;
  }

  addVideoChunk(chunk: EncodedVideoChunk, meta?: EncodedVideoChunkMetadataJs): void {
    this.videoDesc ??= meta?.decoderConfig?.description;
    const data = new Uint8Array(chunk.byteLength);
    chunk.copyTo(data);
    this.videoChunks.push({
      data,
      alphaSideData: meta?.alphaSideData,
      type: chunk.type,
      timestampS: chunk.timestamp / 1e6,
      durationS: (chunk.duration ?? 0) / 1e6,
    });
  }

  addAudioChunk(chunk: EncodedAudioChunk, meta?: EncodedAudioChunkMetadataJs): void {
    if (!this.audioInit && meta?.decoderConfig) {
      const { sampleRate = 44100, numberOfChannels = 2, description } = meta.decoderConfig;
      this.audioInit = { sampleRate, numberOfChannels, description };
    }
    const data = new Uint8Array(chunk.byteLength);
    chunk.copyTo(data);
    this.audioChunks.push({
      data,
      type: chunk.type,
      timestampS: chunk.timestamp / 1e6,
      durationS: (chunk.duration ?? 0) / 1e6,
    });
  }

  abstract finalize(): Promise<string>;
}
