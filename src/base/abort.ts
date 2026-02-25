// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/11.

import type { ProcessHandle } from "./process";

export type AsyncTask = () => Promise<void> | void;
export type AbortQuery = () => Promise<boolean> | boolean;

export class AbortLink {
  private _callback?: AsyncTask;
  private _aborted?: boolean;
  private _stopped = false;

  private constructor(
    readonly query?: AbortQuery,
    readonly interval: number = 1000,
  ) {
    if (query) {
      this.tick();
    }
  }

  static start(query?: AbortQuery, interval?: number) {
    return new AbortLink(query, interval);
  }

  get aborted() {
    return !this._stopped && this._aborted;
  }

  get stopped() {
    return this._stopped;
  }

  async onAbort(callback: AsyncTask) {
    if (this._aborted) {
      await callback();
    } else {
      this._callback = callback;
    }
  }

  wait(...handles: ProcessHandle[]) {
    const abort = new Promise((_, reject) => {
      this.onAbort(async () => {
        handles.forEach((h) => h.process.kill());
        reject(new Error("aborted"));
      });
    });
    return Promise.race([
      abort,
      Promise.all(handles.map((h) => h.wait)), //
    ]);
  }

  stop() {
    this._stopped = true;
  }

  private tick() {
    setTimeout(async () => {
      if (this._stopped) {
        return;
      }
      this._aborted = await this.query?.();
      if (this._stopped) {
        return;
      }
      if (this._aborted) {
        await this._callback?.();
      } else {
        this.tick();
      }
    }, this.interval);
  }
}
