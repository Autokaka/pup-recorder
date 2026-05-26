// Created by Lu Ao (luao@bilibili.com) on 2026/05/18.

import type { WebFrameMain } from "electron";
import { logger } from "../../base/logging";
import { withTimeout } from "../../base/timing";

const TAG = "[Video]";
export const VIDEO_SYMBOL = "__pup_video__";

const ADVANCE_TIMEOUT_MS = 5_000;

export async function advanceVideos(frame: WebFrameMain | undefined, timestampMs: number): Promise<void> {
  if (!frame || !frame.url) return;
  try {
    const expr = `window.${VIDEO_SYMBOL}&&window.${VIDEO_SYMBOL}.advance(${timestampMs})`;
    const ev = frame.executeJavaScript(expr);
    await withTimeout(ev, ADVANCE_TIMEOUT_MS, "video.advance");
  } catch (e) {
    logger.warn(TAG, `advance skipped: ${e instanceof Error ? e.message : String(e)}`);
  }
}
