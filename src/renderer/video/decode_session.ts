// Created by Autokaka (qq1909698494@gmail.com) on 2026/09/02.

import { logger } from "../../base/logging";
import { decodeFrames } from "./decode";
import type { VideoMeta } from "./frame_server";

const TAG = "[DecodeSession]";
const DECODE_AHEAD = 4; // decode a few frames past the highest request; the page already prefetches
const KEEP_BEHIND = 16; // min frames held behind the head; must exceed the page's prefetch lead
const MEMORY_BUDGET = 256 * 1024 * 1024; // retain decoded frames up to this per-session budget so a small looping video re-serves from memory instead of re-decoding
const MAX_PASS_RETRY = 3; // re-open a streamed source this many times on a transient decode error before reporting end-of-stream

// A source plays on its own clock: the pump decodes ahead into the frame store continuously, and getFrame only ever reads the store.
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

  getFrame(idx: number): Buffer | undefined {
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
      const pendingFrom = this._seekTo ?? this._passFrom;
      if (idx < pendingFrom || idx > this._ready + this._seekJump) {
        this._want = idx;
        this.requestRestart(idx);
      } else {
        this._want = Math.max(this._want, idx);
        this.wake();
      }
    } else {
      // Evicted (loop/rewind): restart the pump at the requested frame.
      this._ready = 0;
      this._done = false;
      this.requestRestart(idx);
    }
    return undefined;
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

  private requestRestart(target?: number): void {
    this._seekTo = target;
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
      await this.untilRestart();
    }
  }

  private async decodePass(gen: number): Promise<void> {
    const from = this._seekTo;
    this._seekTo = undefined;
    this._passFrom = from ?? 1;
    const stream = decodeFrames({ src: this._src, meta: this.meta, signal: this._ctrl.signal, fromIdx: from });
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
