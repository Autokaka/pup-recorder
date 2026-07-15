// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/05.

import { setTimeout } from "node:timers/promises";
import { sleep } from "./timing";

export interface RetryOptions<Args extends unknown[], Ret> {
  fn: (...args: Args) => Promise<Ret>;
  maxAttempts?: number;
  timeout?: number;
  // Abort bails immediately instead of retrying; signal is not auto-threaded into fn — caller wires it (fetch, S3 send).
  signal?: AbortSignal;
}

export function useRetry<Args extends unknown[], Ret>({
  fn,
  maxAttempts = 3,
  timeout,
  signal,
}: RetryOptions<Args, Ret>) {
  const timeoutError = new Error(`timeout over ${timeout}ms`);
  return async (...args: Args) => {
    let attempt = 0;
    while (true) {
      signal?.throwIfAborted();
      try {
        const promises = [fn(...args)];
        if (timeout) {
          promises.push(
            setTimeout(timeout).then(() => {
              throw timeoutError;
            }),
          );
        }
        return await Promise.race(promises);
      } catch (e) {
        signal?.throwIfAborted();
        attempt++;
        if (attempt >= maxAttempts) {
          throw e;
        }
        await sleep(2 ** attempt * 100 + Math.random() * 100);
      }
    }
  };
}
