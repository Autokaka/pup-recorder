// Created by Autokaka (qq1909698494@gmail.com) on 2026/09/01.
// Copyright © 2026 bilibili. All rights reserved.

import { logger } from "../../base/logging";
import { decodeFrames } from "./decode";
import type { VideoMeta } from "./frame_server";

export const DECODE_AHEAD = 4; // decode a few frames past the highest request; the page already prefetches
const MAX_PASS_RETRY = 3; // re-open a streamed source this many times on a transient decode error before reporting end-of-stream

// What the pump needs from its session: the demand clock, the frame store, and the closed flag.
export interface PumpHost {
  readonly meta: VideoMeta;
  readonly src: string;
  closed(): boolean;
  // True while the next content frame outruns demand by more than the pump may decode ahead.
  aheadOfDemand(idx: number): boolean;
  serve(idx: number, buf: Buffer): void;
  passEnded(): void;
}

// The pass scheduler: runs decode passes, invalidates them on restart, parks when ahead of demand.
export class DecodePump {
  private _gen = 0;
  private _seekTo: number | undefined;
  private _passFrom = 1;
  private _ctrl = new AbortController();
  private _resume: (() => void) | undefined;
  private _restart: (() => void) | undefined;
  private _done: Promise<void> | undefined;

  constructor(private readonly _host: PumpHost) {}

  // Floor the running (or queued) pass decodes from — requests below it need a re-targeted restart.
  get pendingFrom(): number {
    return this._seekTo ?? this._passFrom;
  }

  get done(): Promise<void> {
    this._done ??= this.run();
    return this._done;
  }

  requestRestart(target?: number): void {
    this._seekTo = target;
    this._gen++;
    const r = this._restart;
    this._restart = undefined;
    r?.();
    this.wake();
  }

  abort(): void {
    this._ctrl.abort();
    this.wake();
  }

  // Nudge a parked pass: new demand arrived within its decode window.
  wake(): void {
    const r = this._resume;
    this._resume = undefined;
    r?.();
  }

  private async run(): Promise<void> {
    let fails = 0;
    while (!this._host.closed()) {
      const gen = this._gen;
      let failed = false;
      try {
        await this.decodePass(gen);
      } catch (e) {
        if (!this._host.closed && this._gen === gen) {
          failed = true;
          logger.warn(
            "[DecodePump]",
            `[${this._host.meta.id.slice(0, 8)}] decode pass failed: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }
      if (this._host.closed()) {
        break;
      }
      if (this._gen !== gen) {
        fails = 0;
        continue; // restart requested mid-pass
      }
      // A thrown pass is a transient source error (e.g. a streamed loop re-open); retry instead of reporting EOF, which would blank the frame.
      if (failed && ++fails <= MAX_PASS_RETRY) {
        continue;
      }
      fails = 0;
      this._host.passEnded();
      await this.untilRestart();
    }
  }

  private async decodePass(gen: number): Promise<void> {
    const from = this._seekTo;
    this._seekTo = undefined;
    this._passFrom = from ?? 1;
    const stream = decodeFrames({
      src: this._host.src,
      meta: this._host.meta,
      signal: this._ctrl.signal,
      fromIdx: from,
    });
    for await (const { idx, buf } of stream) {
      if (this._host.closed() || this._gen !== gen) {
        return;
      }
      while (!this._host.closed() && this._gen === gen && this._host.aheadOfDemand(idx)) {
        await this.pause();
      }
      if (this._host.closed() || this._gen !== gen) {
        return;
      }
      this._host.serve(idx, buf);
    }
  }

  private pause(): Promise<void> {
    return new Promise<void>((r) => {
      this._resume = r;
    });
  }

  // Park until a loop/backward request (or close) calls requestRestart().
  private untilRestart(): Promise<void> {
    if (this._host.closed()) {
      return Promise.resolve();
    }
    return new Promise<void>((r) => {
      this._restart = r;
    });
  }
}
