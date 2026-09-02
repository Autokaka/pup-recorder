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
  // Software decode with auto-detected threads (ffmpeg's default of 1 leaves most cores idle on 1080p).
  using dec = await Decoder.create(stream, { signal, threadCount: 0 });
  const { frameWidth, frameHeight, width, height, fps } = meta;
  const scale = frameWidth !== width || frameHeight !== height ? `scale=${frameWidth}:${frameHeight},` : "";
  // Odd native widths (1922 etc) have no NEON swscale path; pad-right to 16-aligned and trim in packRgba.
  const align = (n: number): number => Math.ceil(n / 16) * 16;
  const pad =
    scale === "" && (frameWidth % 16 !== 0 || frameHeight % 16 !== 0)
      ? `pad=${align(frameWidth)}:${align(frameHeight)}:0:0,`
      : "";
  using filter = FilterAPI.create(`fps=${fps},${scale}${pad}format=rgba`, { signal });
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
    yield { idx: k, buf: packRgba(frame, frameWidth, frameHeight) };
  }
}

// Tight RGBA of the top-left outW×outH region (drops libav row padding and any pad-right/bottom planes).
function packRgba(frame: Frame, outW: number, outH: number): Buffer {
  const row = outW * 4;
  const stride = frame.linesize[0]!;
  const src = frame.data![0]!;
  if (stride === row && frame.height === outH) {
    return Buffer.from(src.subarray(0, row * outH));
  }
  const out = Buffer.allocUnsafe(row * outH);
  for (let y = 0; y < outH; y++) {
    src.copy(out, y * row, y * stride, y * stride + row);
  }
  return out;
}
