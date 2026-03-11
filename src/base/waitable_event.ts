// Created by Autokaka (qq1909698494@gmail.com) on 2026/03/10.

export interface WaitOptions {
  timeout: number;
  onTimeout?: () => void;
}

export class WaitableEvent {
  private _promise?: Promise<void>;
  private _resolve?: () => void;
  private _timeoutToken?: NodeJS.Timeout;

  wait(options?: WaitOptions): Promise<void> {
    if (this._promise) {
      throw new Error("already waiting");
    }
    this._promise = new Promise((resolve) => {
      this._resolve = resolve;
      if (options?.timeout !== undefined) {
        this._timeoutToken = setTimeout(() => {
          options.onTimeout?.();
          resolve();
        }, options.timeout);
      }
    });
    return this._promise;
  }

  signal() {
    clearTimeout(this._timeoutToken);
    this._promise = undefined;
    this._resolve?.();
  }
}
