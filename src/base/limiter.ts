// Created by Autokaka (qq1909698494@gmail.com) on 2026/01/30.

interface QueueEntry {
  run: VoidFunction;
  reject: (reason: unknown) => void;
  signal?: AbortSignal;
}

export class ConcurrencyLimiter {
  private _active = 0;
  private _queue: QueueEntry[] = [];
  private _signals = new WeakSet<AbortSignal>();
  private _resolve?: VoidFunction;

  constructor(readonly maxConcurrency: number) {}

  get active(): number {
    return this._active;
  }

  get pending(): number {
    return this._queue.length;
  }

  get stats(): string {
    return `active: ${this.active}, pending: ${this.pending}`;
  }

  async schedule<T>(fn: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    signal?.throwIfAborted();

    if (signal && !this._signals.has(signal)) {
      this._signals.add(signal);
      signal.addEventListener("abort", () => this.flush(signal), { once: true });
    }

    return new Promise<T>((resolve, reject) => {
      this._queue.push({
        run: () => {
          if (signal?.aborted) {
            reject(signal.reason);
            this.next();
            return;
          }
          this._active++;
          fn()
            .then((v) => {
              this._active--;
              resolve(v);
              this.next();
            })
            .catch((e) => {
              this._active--;
              reject(e);
              this.next();
            });
        },
        reject,
        signal,
      });
      this.next();
    });
  }

  async drain(): Promise<void> {
    if (this._active === 0 && this.pending === 0) return;
    return new Promise((r) => (this._resolve = r));
  }

  private flush(signal: AbortSignal) {
    const keep: QueueEntry[] = [];
    for (const entry of this._queue) {
      if (entry.signal === signal) {
        entry.reject(signal.reason);
      } else {
        keep.push(entry);
      }
    }
    this._queue = keep;
    this.next();
  }

  private next() {
    if (this._active === 0 && this.pending === 0) {
      this._resolve?.();
      this._resolve = undefined;
      return;
    }
    if (this._active < this.maxConcurrency) {
      this._queue.shift()?.run();
    }
  }
}
