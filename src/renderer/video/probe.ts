// Created by Autokaka (qq1909698494@gmail.com) on 2026/05/18.

import { Decoder } from "node-av/api";
import { AVMEDIA_TYPE_VIDEO } from "node-av/constants";
import { openInput } from "./open";

export interface ProbeResult {
  width: number;
  height: number;
  duration: number;
  /** PTS (s) of the first decodable frame; a corrupt/empty leading run is held on it, like Chrome. */
  leadGap: number;
}

// No wall-clock cap: openInput's per-read rw_timeout bounds a stuck source, and the caller retries on throw.
export async function probe(src: string): Promise<ProbeResult> {
  await using d = await openInput(src);
  const stream = d.streams?.find((s) => s.codecpar.codecType === AVMEDIA_TYPE_VIDEO);
  if (!stream) {
    throw new Error("probe: no video stream");
  }
  const duration = d.duration > 0 ? d.duration : 0;
  const tb = stream.timeBase.num / stream.timeBase.den;
  using dec = await Decoder.create(stream, { threadCount: 1 });
  let leadGap = 0;
  // First clean frame's PTS = where content begins; skip corrupt frames like a browser.
  outer: for await (using pkt of d.packets(stream.index)) {
    try {
      for await (using frame of dec.frames(pkt)) {
        if (frame?.decodeErrorFlags !== 0) {
          continue;
        }
        leadGap = Math.max(0, Number(frame.pts) * tb);
        break outer;
      }
    } catch {
      // corrupt packet — skip to the next
    }
  }
  return { width: stream.codecpar.width, height: stream.codecpar.height, duration, leadGap };
}
