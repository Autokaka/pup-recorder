// Created by Autokaka (qq1909698494@gmail.com) on 2026/09/02.

import { logger } from "../../base/logging";
import { decodeFrames } from "./decode";
import type { VideoMeta } from "./frame_server";

const TAG = "[DecodeSession]";
const DECODE_AHEAD = 4; // decode a few frames past the highest request; the page already prefetches
const KEEP_BEHIND = 16; // min frames held behind the head; must exceed the page's prefetch lead
const MEMORY_BUDGET = 256 * 1024 * 1024; // decoded-frame budget per session: a small loop re-serves from memory
const MAX_PASS_RETRY = 3; // re-open a streamed source this many times on a transient decode error before EOF

// A source plays on its own clock: the pump fills a frame store ahead of demand; getFrame waits for its frame.
interface FrameWaiter {
  idx: number;
  resolve: (wake: "wake" | "cancel") => void;
}

export class DecodeSession {
  private _buf = new Map<number, Buffer>();
  private _ready = 0;
  private _want = 1;
  private _done = false;
  private _closed = false;
  private _gen = 0;
  private _ctrl = new AbortController();
  private _resume: (() => void) | undefined;
  private _restart: (() => void) | undefined;
  private readonly _waiters = new Set<FrameWaiter>();
  private readonly _leadFrames: number;
  private readonly _keepCount: number;
  private readonly _seekJump: number;
  private _seekTo?: number;
  private _passFrom = 1;
  private readonly _pumpDone: Promise<void>;

  constructor(
    readonly meta: VideoMeta,
    private readonly _src: string,
  ) {
    this._leadFrames = Math.round(meta.leadGap * meta.fps);
    this._keepCount = Math.max(KEEP_BEHIND, Math.floor(MEMORY_BUDGET / (meta.frameWidth * meta.frameHeight * 4)));
    this._seekJump = Math.max(2 * meta.fps, DECODE_AHEAD * 2);
    this._pumpDone = this.pump();
  }

  // Waits for the frame to land: paints pace the virtual clock, so stall instead of painting black.
  async getFrame(raw: number): Promise<Buffer | undefined> {
    const idx = raw <= this._leadFrames ? this._leadFrames + 1 : raw; // hold the first frame across the lead
    for (;;) {
      const hit = this._buf.get(idx);
      if (hit) {
        return hit;
      }
      if (this._closed) {
        return undefined;
      }
      if (this._done && idx > this._ready) {
        return Buffer.alloc(0); // beyond end of stream
      }
      this._want = Math.max(this._want, idx);
      if (this.mustRepoint(idx)) {
        this.requestRestart(idx);
      } else {
        this.wake();
      }
      if ((await this.waitEvent(idx)) === "cancel") {
        return undefined; // stale demand dropped by a restart (see requestRestart)
      }
    }
  }

  private mustRepoint(idx: number): boolean {
    if (this._seekTo !== undefined) {
      // A re-point is queued but not started: only a lower target may displace it, or waiters bounce forever.
      return idx < this._seekTo;
    }
    const from = this._passFrom;
    return idx < from || idx <= this._ready || idx > Math.max(this._ready, from) + this._seekJump;
  }

  async close(): Promise<void> {
    this._closed = true;
    this._done = true;
    this._ctrl.abort();
    this.requestRestart();
    this._buf.clear();
    await this._pumpDone;
  }

  private wake(): void {
    const r = this._resume;
    this._resume = undefined;
    r?.();
  }

  private waitEvent(idx: number): Promise<"wake" | "cancel"> {
    return new Promise<"wake" | "cancel">((resolve) => this._waiters.add({ idx, resolve }));
  }

  // Broadcast decode progress (frame stored / pass done / restart / close) to waiting getFrames.
  private signal(): void {
    for (const w of this._waiters) {
      w.resolve("wake");
    }
    this._waiters.clear();
  }

  private requestRestart(target?: number): void {
    this._seekTo = target;
    this._gen++;
    // Drop waiters a restart leaves far behind: they only re-raise _want and drag the pass to the tail.
    if (target !== undefined) {
      for (const w of this._waiters) {
        if (w.idx > target + this._keepCount) {
          this._waiters.delete(w);
          w.resolve("cancel");
        }
      }
    }
    const r = this._restart;
    this._restart = undefined;
    r?.();
    this.wake();
    this.signal();
  }

  private async pump(): Promise<void> {
    let fails = 0;
    while (!this._closed) {
      const gen = this._gen;
      this._ready = 0;
      this._done = false;
      this._buf.clear();
      let failed = false;
      try {
        await this.decodePass(gen);
      } catch (e) {
        if (!this._closed && this._gen === gen) {
          failed = true;
          logger.warn(
            TAG,
            `[${this.meta.id.slice(0, 8)}] decode pass failed: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }
      if (this._closed) {
        break;
      }
      if (this._gen !== gen) {
        fails = 0;
        continue; // restart requested mid-pass
      }
      // A thrown pass is a transient source error (e.g. a streamed loop re-open); retry, else EOF would blank the frame.
      if (failed && ++fails <= MAX_PASS_RETRY) {
        continue;
      }
      fails = 0;
      this._done = true;
      this.signal();
      await this.untilRestart();
    }
  }

  private async decodePass(gen: number): Promise<void> {
    // A seek whose target overshoots the last frame yields nothing; one retry from head beats a false EOF.
    for (let attempt = 0; attempt < 2; attempt++) {
      const from = this._seekTo; // restart target in page-frame space (lead included)
      this._seekTo = undefined;
      this._passFrom = from ?? 1;
      this._want = from ?? 1; // a fresh pass paces off its own start, not the previous pass's tail demand
      // decodeFrames counts post-lead content frames, so a page-key target loses the lead offset.
      const contentFrom = from === undefined ? undefined : Math.max(1, from - this._leadFrames);
      const stream = decodeFrames({ src: this._src, meta: this.meta, signal: this._ctrl.signal, fromIdx: contentFrom });
      let stored = 0;
      for await (const { idx, buf } of stream) {
        if (this._closed || this._gen !== gen) {
          return;
        }
        const at = this._leadFrames + idx; // map decode position past the held lead-gap frames
        while (!this._closed && this._gen === gen && at > this._want + DECODE_AHEAD) {
          await this.pause();
        }
        if (this._closed || this._gen !== gen) {
          return;
        }
        this._buf.set(at, buf);
        this._ready = at;
        this.evict();
        this.signal();
        stored++;
      }
      if (attempt === 0 && stored === 0 && contentFrom !== undefined && !this._closed && this._gen === gen) {
        continue; // seek landed past the last frame: re-decode from head
      }
      return;
    }
  }

  private pause(): Promise<void> {
    return new Promise<void>((r) => {
      this._resume = r;
    });
  }

  // Park until a loop/backward request (or close) calls requestRestart().
  private untilRestart(): Promise<void> {
    return new Promise<void>((r) => {
      this._restart = r;
    });
  }

  private evict(): void {
    const floor = this._ready - this._keepCount;
    for (const k of this._buf.keys()) {
      if (k < floor) {
        this._buf.delete(k);
      }
    }
  }
}
