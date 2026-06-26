// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/01.

import { withTimeout } from "../base/timing";
import { type AdvanceOptions, advanceVideos } from "./video/advance";

export const TICK_SYMBOL = "__pup_tick__";

export async function tick(args: AdvanceOptions) {
  const { frame, timestampMs } = args;
  if (!frame) {
    return;
  }
  const expr = `window.${TICK_SYMBOL}&&window.${TICK_SYMBOL}.process(${timestampMs})`;
  const tickEv = frame.executeJavaScript(expr);
  await Promise.all([withTimeout(tickEv, 5_000, "tick.executeJavaScript"), advanceVideos(args)]);
}
