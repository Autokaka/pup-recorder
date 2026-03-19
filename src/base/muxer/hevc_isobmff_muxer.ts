// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/06.

import {
  EncodedPacket,
  type AudioCodec,
  type IsobmffOutputFormat,
  MovOutputFormat,
  Mp4OutputFormat,
  type VideoCodec,
} from "mediabunny";
import { MediaMuxer, type MuxerOptions, type VideoChunk } from "./media_muxer";

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

const BT709 = { primaries: "bt709", transfer: "bt709", matrix: "bt709", fullRange: false } as const;

class HEVCIsobmffMuxer extends MediaMuxer {
  constructor(
    opts: MuxerOptions,
    private readonly _format: IsobmffOutputFormat,
  ) {
    super(opts);
  }

  protected get format() {
    return this._format;
  }

  protected get videoCodec(): VideoCodec {
    return "hevc";
  }

  protected get audioCodec(): AudioCodec {
    return "aac";
  }

  protected get audioDecoderCodec() {
    return "mp4a.40.2";
  }

  protected get videoConfig(): EncodedVideoChunkMetadata["decoderConfig"] {
    return {
      codec: "hvc1.2.6.L120.B0",
      codedWidth: this.opts.width,
      codedHeight: this.opts.height,
      colorSpace: BT709,
      description: this.videoDesc,
    };
  }

  protected makeVideoPacket({ data, type, timestampS, durationS }: VideoChunk, isFirst: boolean): EncodedPacket {
    return new EncodedPacket(isFirst ? prependAlphaSei(data) : data, type, timestampS, durationS);
  }
}

export const createMp4Muxer = (opts: MuxerOptions) => new HEVCIsobmffMuxer(opts, new Mp4OutputFormat());
export const createMovMuxer = (opts: MuxerOptions) => new HEVCIsobmffMuxer(opts, new MovOutputFormat());
