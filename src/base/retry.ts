// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/05.

import { setTimeout } from "timers/promises";
import { sleep } from "./timing";

export interface RetryOptions<Args extends any[], Ret> {
  fn: (...args: Args) => Promise<Ret>;
  maxAttempts?: number;
  timeout?: number;
  // When provided, useRetry bails out immediately on abort instead of retrying. The signal
  // is not auto-threaded into fn — caller must wire it where it matters (e.g. fetch, S3 send).
  signal?: AbortSignal;
}

export function useRetry<Args extends any[], Ret>({ fn, maxAttempts = 3, timeout, signal }: RetryOptions<Args, Ret>) {
  const timeoutError = new Error(`timeout over ${timeout}ms`);
  return async function (...args: Args) {
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
        await sleep(Math.pow(2, attempt) * 100 + Math.random() * 100);
      }
    }
  };
}
