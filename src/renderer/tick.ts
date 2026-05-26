// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/01.

import type { WebFrameMain } from "electron";
import { withTimeout } from "../base/timing";
import { advanceVideos } from "./video/shim";

export const TICK_SYMBOL = "__pup_tick__";

export async function tick(frame: WebFrameMain | undefined, timestampMs: number) {
  if (!frame) return;
  const expr = `window.${TICK_SYMBOL}&&window.${TICK_SYMBOL}.process(${timestampMs})`;
  const tickEv = frame.executeJavaScript(expr);
  await Promise.all([withTimeout(tickEv, 5_000, "tick.executeJavaScript"), advanceVideos(frame, timestampMs)]);
}
