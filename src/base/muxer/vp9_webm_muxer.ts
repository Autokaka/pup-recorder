// Created by Autokaka (qq1909698494@gmail.com) on 2026/03/14.

import { EncodedPacket, WebMOutputFormat, type AudioCodec, type VideoCodec } from "mediabunny";
import { MediaMuxer, type VideoChunk } from "./media_muxer";

// alphaSideData from @napi-rs/webcodecs: [8-byte block_additional_id] + [VP9 bitstream].
// mediabunny expects only the raw bitstream, so strip the 8-byte prefix.
const toVp9Packet = ({ data, type, timestampS, durationS, alphaSideData }: VideoChunk) =>
  new EncodedPacket(
    data,
    type,
    timestampS,
    durationS,
    -1,
    undefined,
    alphaSideData ? { alpha: alphaSideData.subarray(8) } : undefined,
  );

export class WebMMuxer extends MediaMuxer {
  protected get format() {
    return new WebMOutputFormat();
  }

  protected get videoCodec(): VideoCodec {
    return "vp9";
  }

  protected get audioCodec(): AudioCodec {
    return "opus";
  }

  protected get audioDecoderCodec() {
    return "opus";
  }

  protected get videoConfig(): EncodedVideoChunkMetadata["decoderConfig"] {
    return {
      codec: "vp09.00.31.08",
      codedWidth: this.opts.width,
      codedHeight: this.opts.height,
      description: this.videoDesc,
    };
  }

  protected makeVideoPacket(chunk: VideoChunk): EncodedPacket {
    return toVp9Packet(chunk);
  }
}
