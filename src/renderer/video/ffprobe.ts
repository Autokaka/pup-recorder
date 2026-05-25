// Created by Lu Ao (luao@bilibili.com) on 2026/05/18.

import { Demuxer } from "node-av/api";
import { AVMEDIA_TYPE_VIDEO } from "node-av/constants";

const PROBE_TIMEOUT_MS = 5_000;

export interface ProbeResult {
  width: number;
  height: number;
  duration: number;
}

export async function probe(src: string): Promise<ProbeResult> {
  const signal = AbortSignal.timeout(PROBE_TIMEOUT_MS);
  await using d = await Demuxer.open(src, { signal });
  const stream = d.streams?.find((s) => s.codecpar.codecType === AVMEDIA_TYPE_VIDEO);
  if (!stream) throw new Error(`probe: no video stream in ${src}`);
  const duration = d.duration > 0 ? d.duration : 0;
  return { width: stream.codecpar.width, height: stream.codecpar.height, duration };
}
