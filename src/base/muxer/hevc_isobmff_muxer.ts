// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/06.

import {
  EncodedAudioPacketSource,
  EncodedPacket,
  EncodedVideoPacketSource,
  type IsobmffOutputFormat,
  MovOutputFormat,
  Mp4OutputFormat,
  Output,
} from "mediabunny";
import { MediaMuxer, openFileStreamTarget, toPacket, type BufferedAudio, type BufferedVideo, type MuxerOptions } from "./media_muxer";

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
  private readonly format: IsobmffOutputFormat;

  constructor(opts: MuxerOptions, format: IsobmffOutputFormat) {
    super(opts);
    this.format = format;
  }

  async finalize(): Promise<string> {
    if (this.videoChunks.length === 0) throw new Error("HEVCIsobmffMuxer: no video data");

    const target = await openFileStreamTarget(this.opts.outPath);
    const output = new Output({ format: this.format, target });

    const videoSrc = new EncodedVideoPacketSource("hevc");
    output.addVideoTrack(videoSrc, { frameRate: this.opts.fps });

    const audioSrc = this.audioInit ? new EncodedAudioPacketSource("aac") : undefined;
    if (audioSrc) output.addAudioTrack(audioSrc);

    await output.start();

    const [first, ...rest] = this.videoChunks as [BufferedVideo, ...BufferedVideo[]];
    await videoSrc.add(new EncodedPacket(prependAlphaSei(first.data), first.type, first.timestampS, first.durationS), {
      decoderConfig: {
        codec: "hvc1.2.6.L120.B0",
        codedWidth: this.opts.width,
        codedHeight: this.opts.height,
        colorSpace: BT709,
        description: this.videoDesc,
      },
    });
    for (const chunk of rest) await videoSrc.add(toPacket(chunk));
    videoSrc.close();

    if (audioSrc && this.audioInit) {
      const { sampleRate, numberOfChannels, description } = this.audioInit;
      const [first, ...rest] = this.audioChunks as [BufferedAudio, ...BufferedAudio[]];
      await audioSrc.add(toPacket(first), {
        decoderConfig: { codec: "mp4a.40.2", sampleRate, numberOfChannels, description },
      });
      for (const chunk of rest) await audioSrc.add(toPacket(chunk));
      audioSrc.close();
    }

    await output.finalize();
    return this.opts.outPath;
  }
}

export const createMp4Muxer = (opts: MuxerOptions) => new HEVCIsobmffMuxer(opts, new Mp4OutputFormat());
export const createMovMuxer = (opts: MuxerOptions) => new HEVCIsobmffMuxer(opts, new MovOutputFormat());
