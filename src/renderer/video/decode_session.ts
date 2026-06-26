// Created by Autokaka (qq1909698494@gmail.com) on 2026/06/02.

import { logger } from "../../base/logging";
import { decodeFrames } from "./decode";
import type { VideoMeta } from "./frame_server";

const TAG = "[DecodeSession]";
const DECODE_AHEAD = 4; // decode a few frames past the highest request; the page already prefetches
const KEEP_BEHIND = 16; // min frames held behind the head; must exceed the page's prefetch lead (AHEAD=10)
const MEMORY_BUDGET = 256 * 1024 * 1024; // retain decoded frames up to this per-session budget so a small looping video re-serves from memory instead of re-decoding
const MAX_PASS_RETRY = 3; // re-open a streamed source this many times on a transient decode error before reporting end-of-stream

interface Waiter {
  idx: number;
  resolve: (b: Buffer) => void;
}

// Demand-driven in-process decode (Demuxer→Decoder→fps/scale/rgba filter) serving frame N as tight RGBA; forward-only — a loop/rewind re-decodes from frame 1 unless the whole clip still fits the memory budget.
export class DecodeSession {
  private _buf = new Map<number, Buffer>();
  private _ready = 0;
  private _want = 1;
  private _done = false;
  private _closed = false;
  private _gen = 0;
  private _ctrl = new AbortController();
  private _waiters = new Set<Waiter>();
  private _resume: (() => void) | undefined;
  private _restart: (() => void) | undefined;
  // Lead frames held on the first decodable frame; content idx is offset past them.
  private readonly _leadFrames: number;
  // Frames kept behind the head; a clip that fits the budget retains every frame, so loops re-serve from memory.
  private readonly _keepCount: number;

  constructor(
    readonly meta: VideoMeta,
    private readonly _src: string,
  ) {
    this._leadFrames = Math.round(meta.leadGap * meta.fps);
    this._keepCount = Math.max(KEEP_BEHIND, Math.floor(MEMORY_BUDGET / (meta.frameWidth * meta.frameHeight * 4)));
    void this.pump();
  }

  async getFrame(idx: number): Promise<Buffer> {
    if (idx < 1) {
      idx = 1;
    }
    if (idx <= this._leadFrames) {
      idx = this._leadFrames + 1; // hold the first decodable frame across the lead
    }
    const hit = this._buf.get(idx);
    if (hit) {
      return hit;
    }
    if (this._done && idx > this._ready) {
      return Buffer.alloc(0); // beyond end of stream
    }
    if (idx > this._ready) {
      // forward, not yet decoded in this pass
      if (idx > this._want) {
        this._want = idx;
      }
      this.wake();
    } else {
      // Evicted (loop/rewind): clear ready/done synchronously so the wrap's prefetch burst coalesces into one restart, not one per frame.
      this._ready = 0;
      this._done = false;
      this._want = idx;
      this.requestRestart();
    }
    return this.wait(idx);
  }

  close(): void {
    this._closed = true;
    this._done = true;
    this._ctrl.abort();
    this.wake();
    this.requestRestart();
    for (const w of this._waiters) {
      w.resolve(Buffer.alloc(0));
    }
    this._waiters.clear();
    this._buf.clear();
  }

  // -d-only subsystem, so never time out: drainWaiters resolves on decode, EOF, or close — output never depends on fetch latency.
  private wait(idx: number): Promise<Buffer> {
    return new Promise<Buffer>((resolve) => this._waiters.add({ idx, resolve }));
  }

  private wake(): void {
    const r = this._resume;
    this._resume = undefined;
    r?.();
  }

  // Invalidate the running pass (or wake a parked one) so pump() starts a fresh decode from frame 1.
  private requestRestart(): void {
    this._gen++;
    const r = this._restart;
    this._restart = undefined;
    r?.();
    this.wake();
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
      // A thrown pass is a transient source error (e.g. a streamed loop re-open); retry instead of reporting EOF, which would blank the frame.
      if (failed && ++fails <= MAX_PASS_RETRY) {
        continue;
      }
      fails = 0;
      this._done = true;
      this.drainWaiters();
      await this.untilRestart();
    }
  }

  private async decodePass(gen: number): Promise<void> {
    for await (const { idx, buf } of decodeFrames(this._src, this.meta, this._ctrl.signal)) {
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
      this.drainWaiters();
    }
  }

  private pause(): Promise<void> {
    return new Promise<void>((r) => {
      this._resume = r;
    });
  }

  // Park until a loop/backward request (or close) calls requestRestart().
  private untilRestart(): Promise<void> {
    if (this._closed) {
      return Promise.resolve();
    }
    return new Promise<void>((r) => {
      this._restart = r;
    });
  }

  private evict(): void {
    const floor = this._want - this._keepCount;
    for (const k of this._buf.keys()) {
      if (k < floor) {
        this._buf.delete(k);
      }
    }
  }

  private drainWaiters(): void {
    for (const entry of [...this._waiters]) {
      const hit = this._buf.get(entry.idx);
      if (hit) {
        this._waiters.delete(entry);
        entry.resolve(hit);
      } else if (this._done) {
        this._waiters.delete(entry);
        entry.resolve(Buffer.alloc(0));
      }
    }
  }
}
