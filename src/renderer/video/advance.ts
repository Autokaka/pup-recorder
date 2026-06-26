// Created by Autokaka (qq1909698494@gmail.com) on 2026/05/18.

import type { WebFrameMain } from "electron";
import { logger } from "../../base/logging";
import { abortable } from "../../base/timing";

const TAG = "[Video]";

export interface AdvanceOptions {
  frame: WebFrameMain | undefined;
  timestampMs: number;
  signal?: AbortSignal;
}

// Only the deterministic renderer (shoot) drives this; real-time videos self-tick via rAF in the page.
export async function advanceVideos({ frame, timestampMs, signal }: AdvanceOptions): Promise<void> {
  if (!frame?.url) {
    return;
  }
  signal?.throwIfAborted();
  try {
    // Source opens are wall-time async; settle them first so virtual time can't step onto a blank, not-yet-opened <video>.
    await abortable(frame.executeJavaScript(`window.__pup_video__&&window.__pup_video__.ready()`), signal);
    // No wall-clock cap: a slow fetch delays the frame instead of dropping it, keeping -d output deterministic.
    await abortable(
      frame.executeJavaScript(`window.__pup_video__&&window.__pup_video__.advance(${timestampMs})`),
      signal,
    );
  } catch (e) {
    signal?.throwIfAborted();
    logger.warn(TAG, `advance skipped: ${e instanceof Error ? e.message : String(e)}`);
  }
}
