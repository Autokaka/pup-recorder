// Created by Lu Ao (luao@bilibili.com) on 2026/08/21.

import { logger } from "../base/logging";

const TAG = "[Rerender]";

export const MAX_RENDER_ATTEMPTS = 3;

// Any render failure earns a fresh window+compositor attempt; aborts still stop the loop.
export async function withRerender<T>(signal: AbortSignal, action: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_RENDER_ATTEMPTS; attempt++) {
    try {
      return await action();
    } catch (e) {
      signal.throwIfAborted();
      lastErr = e;
      logger.warn(TAG, `retry ${attempt}/${MAX_RENDER_ATTEMPTS}: ${(e as Error).message}`);
    }
  }
  throw lastErr;
}
