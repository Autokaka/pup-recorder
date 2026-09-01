// Created by Autokaka (qq1909698494@gmail.com) on 2026/06/25.

import type { Frame } from "node-av";
import { Decoder, FilterAPI } from "node-av/api";
import { AVMEDIA_TYPE_VIDEO, AVSEEK_FLAG_BACKWARD } from "node-av/constants";
import { logger } from "../../base/logging";
import type { VideoMeta } from "./frame_server";
import { openInput } from "./open";

const TAG = "[Decode]";

export interface DecodedFrame {
  idx: number;
  buf: Buffer;
}

export interface DecodeFramesOptions {
  src: string;
  meta: VideoMeta;
  signal: AbortSignal;
  /** 1-based content frame to resume decoding from; a failed seek falls back to decoding the whole head. */
  fromIdx?: number;
}

// Decode a source to fps-resampled, display-scaled, tight-RGBA frames (idx = 1-based content position past the lead gap). Consumer backpressure is just pulling slower.
export async function* decodeFrames({ src, meta, signal, fromIdx }: DecodeFramesOptions): AsyncGenerator<DecodedFrame> {
  await using input = await openInput(src, signal);
  let resumeAt: number | undefined;
  if (fromIdx !== undefined && fromIdx > 1) {
    const target = meta.leadGap + (fromIdx - 1) / meta.fps;
    if ((await input.seek(target, -1, AVSEEK_FLAG_BACKWARD)) === 0) {
      resumeAt = fromIdx;
    } else {
      logger.warn(TAG, `seek to frame ${fromIdx} failed, decoding from head`);
    }
  }
  const stream = input.streams?.find((s) => s.codecpar.codecType === AVMEDIA_TYPE_VIDEO);
  if (!stream) {
    throw new Error("no video stream");
  }
  using dec = await Decoder.create(stream, { signal });
  const { frameWidth, frameHeight, width, height, fps } = meta;
  const scale = frameWidth !== width || frameHeight !== height ? `scale=${frameWidth}:${frameHeight},` : "";
  using filter = FilterAPI.create(`fps=${fps},${scale}format=rgba`, { signal });
  let k = 0;
  let prevK = 0;
  for await (using frame of filter.frames(dec.frames(input.packets(stream.index)))) {
    if (!frame) {
      continue;
    }
    if (resumeAt !== undefined) {
      const tb = frame.timeBase.num / frame.timeBase.den;
      const ts = frame.bestEffortTimestamp ?? frame.pts;
      if (ts === undefined) {
        continue;
      }
      const at = Math.round((Number(ts) * tb - meta.leadGap) * meta.fps) + 1;
      if (at < prevK) {
        continue;
      }
      prevK = at;
      if (at < resumeAt) {
        continue;
      }
      k = at;
    } else {
      k++;
    }
    yield { idx: k, buf: packRgba(frame) };
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
