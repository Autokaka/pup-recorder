// Created by Autokaka (qq1909698494@gmail.com) on 2026/03/02.

import { logger } from "../base/logging";

const TAG = "[Rerender]";

export const MAX_RENDER_ATTEMPTS = 3;

export async function withRerender<T>(action: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_RENDER_ATTEMPTS; attempt++) {
    try {
      return await action();
    } catch (e) {
      lastErr = e;
      logger.warn(TAG, `retry ${attempt + 1}/${MAX_RENDER_ATTEMPTS}: ${(e as Error).message}`);
    }
  }
  throw lastErr;
}
