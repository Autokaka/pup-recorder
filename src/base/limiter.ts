// Created by Autokaka (qq1909698494@gmail.com) on 2026/01/30.

export class ConcurrencyLimiter {
  private _active = 0;
  private _queue: VoidFunction[] = [];
  private _pending = 0;
  private _ended = false;

  constructor(readonly maxConcurrency: number) {}

  get active(): number {
    return this._active;
  }

  get pending(): number {
    return this._pending;
  }

  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    if (this._ended) {
      throw new Error("ended");
    }
    return new Promise<T>((resolve, reject) => {
      const run = () => {
        this._active++;
        this._pending--;
        fn()
          .then(resolve)
          .catch(reject)
          .finally(() => {
            this._active--;
            this.next();
          });
      };
      this._pending++;
      if (this._active < this.maxConcurrency) {
        run();
      } else {
        this._queue.push(run);
      }
    });
  }

  async end() {
    if (!this._ended) {
      this._ended = true;
      while (this._active > 0 || this._pending > 0) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
  }

  private next() {
    if (this._active < this.maxConcurrency && this._queue.length > 0) {
      this._queue.shift()?.();
    }
  }
}
