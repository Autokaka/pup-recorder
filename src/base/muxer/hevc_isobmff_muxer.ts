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
  IsobmffOutputFormat,
  MovOutputFormat,
  Mp4OutputFormat,
  Output,
} from "mediabunny";
import type { MediaMuxer } from "./media_muxer";

// Apple HEVC-with-Alpha requires a PREFIX_SEI NALU (type=39) carrying
// alpha_channel_information (SEI type=165) on the first frame to activate
// the alpha decode path in Safari / QuickTime.
// prettier-ignore
const ALPHA_SEI_NALU = new Uint8Array([
  0x4e, 0x01,             // PREFIX_SEI: nal_unit_type=39, layer_id=0, tid=1
  0xa5, 0x04,             // sei_type=165, payload_size=4
  0x00, 0x00, 0x7f, 0x90, // alpha_channel_information: cancel=0, use_idc=0, bit_depth=8, opaque=255
  0x80,                   // RBSP stop bit
]);

const ALPHA_SEI_PREFIX = (() => {
  const buf = new Uint8Array(4 + ALPHA_SEI_NALU.length);
  new DataView(buf.buffer).setUint32(0, ALPHA_SEI_NALU.length, false);
  buf.set(ALPHA_SEI_NALU, 4);
  return buf;
})();

const prependAlphaSei = (data: Uint8Array): Uint8Array => {
  const out = new Uint8Array(ALPHA_SEI_PREFIX.length + data.length);
  out.set(ALPHA_SEI_PREFIX);
  out.set(data, ALPHA_SEI_PREFIX.length);
  return out;
};

interface BufferedVideoChunk {
  data: Uint8Array;
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

const BT709 = { primaries: "bt709", transfer: "bt709", matrix: "bt709", fullRange: false } as const;

export class HEVCIsobmffMuxer implements MediaMuxer {
  private readonly _width: number;
  private readonly _height: number;
  private readonly _format: IsobmffOutputFormat;
  private _videoChunks: BufferedVideoChunk[] = [];
  private _audioChunks: BufferedAudioChunk[] = [];
  private _videoDesc?: Uint8Array;
  private _audioInit?: AudioDecoderInit;

  constructor(width: number, height: number, format: IsobmffOutputFormat) {
    this._width = width;
    this._height = height;
    this._format = format;
  }

  addVideoChunk(chunk: EncodedVideoChunk, meta?: EncodedVideoChunkMetadataJs): void {
    this._videoDesc ??= meta?.decoderConfig?.description;
    const data = new Uint8Array(chunk.byteLength);
    chunk.copyTo(data);
    this._videoChunks.push({
      data,
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
    if (this._videoChunks.length === 0) throw new Error("HEVCIsobmffMuxer: no video data");

    const target = new BufferTarget();
    const output = new Output({ format: this._format, target });

    const videoSrc = new EncodedVideoPacketSource("hevc");
    output.addVideoTrack(videoSrc);

    let audioSrc: EncodedAudioPacketSource | undefined;
    if (this._audioChunks.length > 0) {
      audioSrc = new EncodedAudioPacketSource("aac");
      output.addAudioTrack(audioSrc);
    }

    await output.start();

    const [firstVideo, ...restVideo] = this._videoChunks as [BufferedVideoChunk, ...BufferedVideoChunk[]];
    await videoSrc.add(
      new EncodedPacket(prependAlphaSei(firstVideo.data), firstVideo.type, firstVideo.timestampS, firstVideo.durationS),
      {
        decoderConfig: {
          codec: "hvc1.2.6.L120.B0",
          codedWidth: this._width,
          codedHeight: this._height,
          colorSpace: BT709,
          description: this._videoDesc,
        },
      },
    );
    for (const chunk of restVideo) {
      await videoSrc.add(new EncodedPacket(chunk.data, chunk.type, chunk.timestampS, chunk.durationS));
    }
    videoSrc.close();

    if (audioSrc && this._audioInit) {
      const { sampleRate, numberOfChannels, description } = this._audioInit;
      const [firstAudio, ...restAudio] = this._audioChunks as [BufferedAudioChunk, ...BufferedAudioChunk[]];
      await audioSrc.add(
        new EncodedPacket(firstAudio.data, firstAudio.type, firstAudio.timestampS, firstAudio.durationS),
        { decoderConfig: { codec: "mp4a.40.2", sampleRate, numberOfChannels, description } },
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

export class HEVCMp4Muxer extends HEVCIsobmffMuxer {
  constructor(width: number, height: number) {
    super(width, height, new Mp4OutputFormat());
  }
}

export class HEVCMovMuxer extends HEVCIsobmffMuxer {
  constructor(width: number, height: number) {
    super(width, height, new MovOutputFormat());
  }
}
