// Created by Autokaka (qq1909698494@gmail.com) on 2026/06/25.

import type { Frame } from "node-av";
import { Decoder, FilterAPI } from "node-av/api";
import { AVMEDIA_TYPE_VIDEO } from "node-av/constants";
import type { VideoMeta } from "./frame_server";
import { openInput } from "./open";

export interface DecodedFrame {
  idx: number;
  buf: Buffer;
}

export interface DecodeFramesOptions {
  src: string;
  meta: VideoMeta;
  signal: AbortSignal;
}

// Decode a source to fps-resampled, display-scaled, tight-RGBA frames in order (idx = 1-based decode position). Consumer backpressure is just pulling slower.
export async function* decodeFrames({ src, meta, signal }: DecodeFramesOptions): AsyncGenerator<DecodedFrame> {
  await using input = await openInput(src, signal);
  const stream = input.streams?.find((s) => s.codecpar.codecType === AVMEDIA_TYPE_VIDEO);
  if (!stream) {
    throw new Error("no video stream");
  }
  using dec = await Decoder.create(stream, { signal });
  const { frameWidth, frameHeight, width, height, fps } = meta;
  const scale = frameWidth !== width || frameHeight !== height ? `scale=${frameWidth}:${frameHeight},` : "";
  using filter = FilterAPI.create(`fps=${fps},${scale}format=rgba`, { signal });
  let k = 0;
  for await (using frame of filter.frames(dec.frames(input.packets(stream.index)))) {
    if (!frame) {
      continue;
    }
    yield { idx: ++k, buf: packRgba(frame) };
  }
}

// Tight RGBA copy (drop libav row padding) so the page can wrap it straight into ImageData.
function packRgba(frame: Frame): Buffer {
  const row = frame.width * 4;
  const stride = frame.linesize[0]!;
  const src = frame.data![0]!;
  if (stride === row) {
    return Buffer.from(src.subarray(0, row * frame.height));
  }
  const out = Buffer.allocUnsafe(row * frame.height);
  for (let y = 0; y < frame.height; y++) {
    src.copy(out, y * row, y * stride, y * stride + row);
  }
  return out;
}
