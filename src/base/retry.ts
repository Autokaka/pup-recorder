// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/05.

import { setTimeout } from "timers/promises";
import { sleep } from "./timing";

export interface RetryOptions<Args extends any[], Ret> {
  fn: (...args: Args) => Promise<Ret>;
  maxAttempts?: number;
  timeout?: number;
}

export function useRetry<Args extends any[], Ret>({
  fn,
  maxAttempts = 3,
  timeout,
}: RetryOptions<Args, Ret>) {
  const timeoutError = new Error(`timeout over ${timeout}ms`);
  return async function (...args: Args) {
    let attempt = 0;
    while (true) {
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
        attempt++;
        if (attempt >= maxAttempts) {
          throw e;
        }
        await sleep(Math.pow(2, attempt) * 100 + Math.random() * 100);
      }
    }
  };
}
