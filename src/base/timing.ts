// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/09.

export function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    p.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

// Reject as soon as `signal` aborts, else settle with `p`; no-op passthrough when no signal.
export function abortable<T>(p: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) {
    return p;
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    p.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}

export function periodical(callback: (count: number) => Promise<void> | void, ms: number) {
  let token: NodeJS.Timeout;
  let closed = false;
  async function tick(count: number) {
    await callback(count);
    if (closed) {
      return;
    }
    token = setTimeout(() => tick(count + 1), ms);
  }
  token = setTimeout(() => tick(0), ms);
  return () => {
    closed = true;
    clearTimeout(token);
  };
}
