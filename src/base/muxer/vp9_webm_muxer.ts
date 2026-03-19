// Created by Autokaka (qq1909698494@gmail.com) on 2026/03/14.

import type {
  EncodedAudioChunk,
  EncodedAudioChunkMetadataJs,
  EncodedAudioChunkType,
  EncodedVideoChunk,
  EncodedVideoChunkMetadataJs,
  EncodedVideoChunkType,
} from "@napi-rs/webcodecs";
import {
  BufferTarget,
  EncodedAudioPacketSource,
  EncodedPacket,
  EncodedVideoPacketSource,
  Output,
  WebMOutputFormat,
} from "mediabunny";
import type { MediaMuxer } from "./media_muxer";

interface BufferedVideoChunk {
  data: Uint8Array;
  alphaSideData?: Uint8Array;
  type: EncodedVideoChunkType;
  timestampS: number;
  durationS: number;
}

interface BufferedAudioChunk {
  data: Uint8Array;
  type: EncodedAudioChunkType;
  timestampS: number;
  durationS: number;
}

interface AudioDecoderInit {
  sampleRate: number;
  numberOfChannels: number;
  description?: Uint8Array;
}

const toVp9Packet = ({ data, type, timestampS, durationS, alphaSideData }: BufferedVideoChunk) =>
  new EncodedPacket(
    data,
    type,
    timestampS,
    durationS,
    -1,
    undefined,
    alphaSideData ? { alpha: alphaSideData } : undefined,
  );

export class Vp9WebMMuxer implements MediaMuxer {
  private readonly _width: number;
  private readonly _height: number;
  private _videoChunks: BufferedVideoChunk[] = [];
  private _audioChunks: BufferedAudioChunk[] = [];
  private _videoDesc?: Uint8Array;
  private _audioInit?: AudioDecoderInit;

  constructor(width: number, height: number) {
    this._width = width;
    this._height = height;
  }

  addVideoChunk(chunk: EncodedVideoChunk, meta?: EncodedVideoChunkMetadataJs): void {
    this._videoDesc ??= meta?.decoderConfig?.description;
    const data = new Uint8Array(chunk.byteLength);
    chunk.copyTo(data);
    this._videoChunks.push({
      data,
      alphaSideData: meta?.alphaSideData,
      type: chunk.type,
      timestampS: chunk.timestamp / 1e6,
      durationS: (chunk.duration ?? 0) / 1e6,
    });
  }

  addAudioChunk(chunk: EncodedAudioChunk, meta?: EncodedAudioChunkMetadataJs): void {
    if (!this._audioInit && meta?.decoderConfig) {
      const { sampleRate = 44100, numberOfChannels = 2, description } = meta.decoderConfig;
      this._audioInit = { sampleRate, numberOfChannels, description };
    }
    const data = new Uint8Array(chunk.byteLength);
    chunk.copyTo(data);
    this._audioChunks.push({
      data,
      type: chunk.type,
      timestampS: chunk.timestamp / 1e6,
      durationS: (chunk.duration ?? 0) / 1e6,
    });
  }

  async finalize(): Promise<Uint8Array> {
    if (this._videoChunks.length === 0) throw new Error("Vp9WebMMuxer: no video data");

    const target = new BufferTarget();
    const output = new Output({ format: new WebMOutputFormat(), target });

    const videoSrc = new EncodedVideoPacketSource("vp9");
    output.addVideoTrack(videoSrc);

    let audioSrc: EncodedAudioPacketSource | undefined;
    if (this._audioChunks.length > 0) {
      audioSrc = new EncodedAudioPacketSource("opus");
      output.addAudioTrack(audioSrc);
    }

    await output.start();

    const [firstVideo, ...restVideo] = this._videoChunks as [BufferedVideoChunk, ...BufferedVideoChunk[]];
    await videoSrc.add(toVp9Packet(firstVideo), {
      decoderConfig: {
        codec: "vp09.00.31.08",
        codedWidth: this._width,
        codedHeight: this._height,
        description: this._videoDesc,
      },
    });
    for (const chunk of restVideo) {
      await videoSrc.add(toVp9Packet(chunk));
    }
    videoSrc.close();

    if (audioSrc && this._audioInit) {
      const { sampleRate, numberOfChannels, description } = this._audioInit;
      const [firstAudio, ...restAudio] = this._audioChunks as [BufferedAudioChunk, ...BufferedAudioChunk[]];
      await audioSrc.add(
        new EncodedPacket(firstAudio.data, firstAudio.type, firstAudio.timestampS, firstAudio.durationS),
        {
          decoderConfig: { codec: "opus", sampleRate, numberOfChannels, description },
        },
      );
      for (const chunk of restAudio) {
        await audioSrc.add(new EncodedPacket(chunk.data, chunk.type, chunk.timestampS, chunk.durationS));
      }
      audioSrc.close();
    }

    await output.finalize();
    return new Uint8Array(target.buffer!);
  }
}
