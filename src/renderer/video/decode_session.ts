// Created by Autokaka (qq1909698494@gmail.com) on 2026/06/02.

import type { Frame } from "node-av";
import { Decoder, Demuxer, FilterAPI } from "node-av/api";
import { AVMEDIA_TYPE_VIDEO } from "node-av/constants";
import { logger } from "../../base/logging";
import type { VideoMeta } from "./frame_server";

const TAG = "[DecodeSession]";
const WAIT_TIMEOUT_MS = 5_000;
const DECODE_AHEAD = 4; // decode a few frames past the highest request; the page already prefetches
const KEEP_BEHIND = 16; // must exceed the page's prefetch lead (AHEAD=10) or the painted frame gets evicted → restart thrash

interface Waiter {
  resolve: (b: Buffer) => void;
  timer: NodeJS.Timeout;
}

// In-process decode: Demuxer → Decoder → `fps=N,scale,format=rgba` filter, serving the Nth filtered frame
// as tight RGBA by index. Demand-driven (decodes ahead of the highest request, then pauses) so only a
// ~20-frame window stays resident. A request for an already-passed frame (loop/backward seek) restarts the
// pass from frame 1 — the decoder is forward-only, so rewind = re-decode.
export class DecodeSession {
  private buf = new Map<number, Buffer>();
  private ready = 0;
  private want = 1;
  private done = false;
  private closed = false;
  private gen = 0;
  private ctrl = new AbortController();
  private waiters = new Set<{ idx: number; w: Waiter }>();
  private resume: (() => void) | undefined;
  private restart: (() => void) | undefined;

  constructor(
    readonly meta: VideoMeta,
    private readonly src: string,
  ) {
    void this.pump();
  }

  async getFrame(idx: number): Promise<Buffer> {
    if (idx < 1) idx = 1;
    const hit = this.buf.get(idx);
    if (hit) return hit;
    if (this.done && idx > this.ready) return Buffer.alloc(0); // beyond end of stream
    if (idx > this.ready) {
      // forward, not yet decoded in this pass
      if (idx > this.want) this.want = idx;
      this.wake();
    } else {
      // already passed but evicted (loop / backward seek) → re-decode from the start, targeting idx
      this.want = idx;
      this.requestRestart();
    }
    return this.wait(idx);
  }

  close(): void {
    this.closed = true;
    this.done = true;
    this.ctrl.abort();
    this.wake();
    this.requestRestart();
    for (const { w } of this.waiters) {
      clearTimeout(w.timer);
      w.resolve(Buffer.alloc(0));
    }
    this.waiters.clear();
    this.buf.clear();
  }

  private wait(idx: number): Promise<Buffer> {
    return new Promise<Buffer>((resolve) => {
      const w: Waiter = {
        resolve,
        timer: setTimeout(() => {
          this.waiters.delete(entry);
          resolve(Buffer.alloc(0));
        }, WAIT_TIMEOUT_MS),
      };
      const entry = { idx, w };
      this.waiters.add(entry);
    });
  }

  private wake(): void {
    const r = this.resume;
    this.resume = undefined;
    r?.();
  }

  // Invalidate the running pass (or wake a parked one) so pump() starts a fresh decode from frame 1.
  private requestRestart(): void {
    this.gen++;
    const r = this.restart;
    this.restart = undefined;
    r?.();
    this.wake();
  }

  private async pump(): Promise<void> {
    while (!this.closed) {
      const gen = this.gen;
      this.ready = 0;
      this.done = false;
      this.buf.clear();
      try {
        await this.decodePass(gen);
      } catch (e) {
        if (!this.closed && this.gen === gen)
          logger.warn(TAG, `[${this.meta.id.slice(0, 8)}] decode ended: ${e instanceof Error ? e.message : String(e)}`);
      }
      if (this.closed) break;
      if (this.gen !== gen) continue; // restart requested mid-pass
      this.done = true;
      this.drainWaiters();
      await this.untilRestart();
    }
  }

  private async decodePass(gen: number): Promise<void> {
    const signal = this.ctrl.signal;
    await using input = await Demuxer.open(this.src, { signal });
    const stream = input.streams?.find((s) => s.codecpar.codecType === AVMEDIA_TYPE_VIDEO);
    if (!stream) throw new Error("no video stream");
    using dec = await Decoder.create(stream, { signal });
    const { frameWidth, frameHeight, width, height, fps } = this.meta;
    const scale = frameWidth !== width || frameHeight !== height ? `scale=${frameWidth}:${frameHeight},` : "";
    using filter = FilterAPI.create(`fps=${fps},${scale}format=rgba`, { signal });
    let idx = 0;
    for await (using frame of filter.frames(dec.frames(input.packets(stream.index)))) {
      if (this.closed || this.gen !== gen) return;
      if (!frame) continue;
      idx++;
      while (!this.closed && this.gen === gen && idx > this.want + DECODE_AHEAD) await this.pause();
      if (this.closed || this.gen !== gen) return;
      this.buf.set(idx, packRgba(frame));
      this.ready = idx;
      this.evict();
      this.drainWaiters();
    }
  }

  private pause(): Promise<void> {
    return new Promise<void>((r) => (this.resume = r));
  }

  // Park until a loop/backward request (or close) calls requestRestart().
  private untilRestart(): Promise<void> {
    if (this.closed) return Promise.resolve();
    return new Promise<void>((r) => (this.restart = r));
  }

  private evict(): void {
    const floor = this.want - KEEP_BEHIND;
    for (const k of this.buf.keys()) if (k < floor) this.buf.delete(k);
  }

  private drainWaiters(): void {
    for (const entry of [...this.waiters]) {
      const hit = this.buf.get(entry.idx);
      if (hit) {
        this.waiters.delete(entry);
        clearTimeout(entry.w.timer);
        entry.w.resolve(hit);
      } else if (this.done) {
        this.waiters.delete(entry);
        clearTimeout(entry.w.timer);
        entry.w.resolve(Buffer.alloc(0));
      }
    }
  }
}

// Tight RGBA copy (drop libav row padding) so the page can wrap it straight into ImageData.
function packRgba(frame: Frame): Buffer {
  const row = frame.width * 4;
  const stride = frame.linesize[0]!;
  const src = frame.data![0]!;
  if (stride === row) return Buffer.from(src.subarray(0, row * frame.height));
  const out = Buffer.allocUnsafe(row * frame.height);
  for (let y = 0; y < frame.height; y++) src.copy(out, y * row, y * stride, y * stride + row);
  return out;
}
