// Created by Autokaka (qq1909698494@gmail.com) on 2026/03/14.

import {
  EncodedAudioPacketSource,
  EncodedPacket,
  EncodedVideoPacketSource,
  Output,
  WebMOutputFormat,
} from "mediabunny";
import { MediaMuxer, openFileStreamTarget, toPacket, type BufferedAudio, type BufferedVideo } from "./media_muxer";

// alphaSideData from @napi-rs/webcodecs follows the WebCodecs convention:
// [8 bytes: block_additional_id as uint64 big-endian] + [raw VP9 alpha bitstream].
// mediabunny expects only the raw VP9 bitstream, so we strip the 8-byte ID prefix.
const toVp9Packet = ({ data, type, timestampS, durationS, alphaSideData }: BufferedVideo) =>
  new EncodedPacket(
    data,
    type,
    timestampS,
    durationS,
    -1,
    undefined,
    alphaSideData ? { alpha: alphaSideData.subarray(8) } : undefined,
  );

export class Vp9WebMMuxer extends MediaMuxer {
  async finalize(): Promise<string> {
    if (this.videoChunks.length === 0) throw new Error("Vp9WebMMuxer: no video data");

    const target = await openFileStreamTarget(this.opts.outPath);
    const output = new Output({ format: new WebMOutputFormat(), target });

    const videoSrc = new EncodedVideoPacketSource("vp9");
    output.addVideoTrack(videoSrc, { frameRate: this.opts.fps });

    const audioSrc = this.audioInit ? new EncodedAudioPacketSource("opus") : undefined;
    if (audioSrc) output.addAudioTrack(audioSrc);

    await output.start();

    const [first, ...rest] = this.videoChunks as [BufferedVideo, ...BufferedVideo[]];
    await videoSrc.add(toVp9Packet(first), {
      decoderConfig: {
        codec: "vp09.00.31.08",
        codedWidth: this.opts.width,
        codedHeight: this.opts.height,
        description: this.videoDesc,
      },
    });
    for (const chunk of rest) await videoSrc.add(toVp9Packet(chunk));
    videoSrc.close();

    if (audioSrc && this.audioInit) {
      const { sampleRate, numberOfChannels, description } = this.audioInit;
      const [first, ...rest] = this.audioChunks as [BufferedAudio, ...BufferedAudio[]];
      await audioSrc.add(toPacket(first), {
        decoderConfig: { codec: "opus", sampleRate, numberOfChannels, description },
      });
      for (const chunk of rest) await audioSrc.add(toPacket(chunk));
      audioSrc.close();
    }

    await output.finalize();
    return this.opts.outPath;
  }
}
