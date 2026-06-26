// Created by Autokaka (qq1909698494@gmail.com) on 2026/06/23.

import { Demuxer, type DemuxerOptions } from "node-av/api";

// ffmpeg read/write deadline (µs); a blocking open ignores AbortSignal, so this bounds a stuck CDN.
const RW_TIMEOUT_US = "8000000";

// ffmpeg opens http/https with native byte-range requests, so only the decoded ranges download.
export function openInput(src: string, signal?: AbortSignal): Promise<Demuxer> {
  const options: DemuxerOptions = { signal, options: { rw_timeout: RW_TIMEOUT_US } };
  return Demuxer.open(src, options);
}
