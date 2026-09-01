// Created by Autokaka (qq1909698494@gmail.com) on 2026/06/02.

import { DECODE_AHEAD, DecodePump } from "./decode_pump";
import type { VideoMeta } from "./frame_server";

const KEEP_BEHIND = 16; // min frames held behind the head; must exceed the page's prefetch lead (AHEAD=10)
const MEMORY_BUDGET = 256 * 1024 * 1024; // retain decoded frames up to this per-session budget so a small looping video re-serves from memory instead of re-decoding

interface Waiter {
  idx: number;
  resolve: (b: Buffer) => void;
}

// Demand-driven in-process decode (Demuxer→Decoder→fps/scale/rgba filter) serving frame N as tight RGBA; forward-only — a loop/rewind re-decodes from the requested frame unless the whole clip still fits the memory budget.
export class DecodeSession {
  private _buf = new Map<number, Buffer>();
  private _ready = 0;
  private _want = 1;
  private _done = false;
  private _closed = false;
  private _waiters = new Set<Waiter>();
  // Lead frames held on the first decodable frame; content idx is offset past them.
  private readonly _leadFrames: number;
  // Frames kept behind the head; a clip that fits the budget retains every frame, so loops re-serve from memory.
  private readonly _keepCount: number;
  // A request this far ahead of decoded progress is a page scrub, not playback — re-open at the target.
  private readonly _seekJump: number;
  private readonly _pump: DecodePump;
  private readonly _pumpDone: Promise<void>;

  constructor(
    readonly meta: VideoMeta,
    private readonly _src: string,
  ) {
    this._leadFrames = Math.round(meta.leadGap * meta.fps);
    this._keepCount = Math.max(KEEP_BEHIND, Math.floor(MEMORY_BUDGET / (meta.frameWidth * meta.frameHeight * 4)));
    this._seekJump = Math.max(2 * meta.fps, DECODE_AHEAD * 2);
    this._pump = new DecodePump({
      meta,
      src: this._src,
      closed: () => this._closed,
      aheadOfDemand: (idx) => idx + this._leadFrames > this.demand + DECODE_AHEAD,
      serve: (idx, buf) => this.serve(idx, buf),
      passEnded: () => this.passEnded(),
    });
    this._pumpDone = this._pump.done;
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
      // forward, not yet decoded in this pass; pendingFrom = where it (or the queued restart) will decode from —
      // a restart to a lower target is still spinning up (_ready is stale at 0), so it would never cover idx.
      const pendingFrom = this._pump.pendingFrom;
      if (idx < pendingFrom || idx > this._ready + this._seekJump) {
        this._pump.requestRestart(idx);
      } else {
        this._want = Math.max(this._want, idx);
        this._pump.wake();
      }
    } else {
      // Evicted (loop/rewind): clear ready/done synchronously so the wrap's prefetch burst coalesces into one restart, not one per frame.
      this._ready = 0;
      this._done = false;
      this._want = idx;
      this._pump.requestRestart(idx);
    }
    return this.wait(idx);
  }

  // Await the pump so the node-av demuxer/decoder generators unwind (contexts freed) before the caller exits.
  async close(): Promise<void> {
    this._closed = true;
    this._done = true;
    this._pump.abort();
    this._pump.requestRestart();
    for (const w of this._waiters) {
      w.resolve(Buffer.alloc(0));
    }
    this._waiters.clear();
    this._buf.clear();
    await this._pumpDone;
  }

  // -d-only subsystem, so never time out: drainWaiters resolves on decode, EOF, or close — output never depends on fetch latency.
  private wait(idx: number): Promise<Buffer> {
    return new Promise<Buffer>((resolve) => this._waiters.add({ idx, resolve }));
  }

  private serve(idx: number, buf: Buffer): void {
    const at = this._leadFrames + idx; // map decode position past the held lead-gap frames
    this._buf.set(at, buf);
    this._ready = at;
    // Drain before evict: with want far ahead the floor covers this frame, and evicting it first starves its waiter forever.
    this.drainWaiters();
    this.evict();
  }

  private passEnded(): void {
    this._done = true;
    this.drainWaiters();
  }

  // Waiters that survived a rewind restart are still demand; ignoring them parks the pass and starves them forever.
  private get demand(): number {
    let d = this._want;
    for (const w of this._waiters) {
      if (w.idx > d) {
        d = w.idx;
      }
    }
    return d;
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
