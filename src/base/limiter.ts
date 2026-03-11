// Created by Autokaka (qq1909698494@gmail.com) on 2026/01/30.

export class ConcurrencyLimiter {
  private _active = 0;
  private _queue: VoidFunction[] = [];
  private _ended = false;

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

  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    if (this._ended) {
      throw new Error("ended");
    }
    return new Promise<T>((resolve, reject) => {
      const run = () => {
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
      };
      this._queue.push(run);
      this.next();
    });
  }

  async end() {
    if (this._ended) {
      return;
    }
    this._ended = true;
    while (this._active > 0 || this.pending > 0) {
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  private next() {
    if (this._active < this.maxConcurrency) {
      this._queue.shift()?.();
    }
  }
}
