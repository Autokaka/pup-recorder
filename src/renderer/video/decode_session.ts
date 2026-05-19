// Created by Lu Ao (luao@bilibili.com) on 2026/05/18.

import { spawn, type ChildProcess } from "child_process";
import { ffmpegPath } from "node-av/ffmpeg";
import { logger } from "../../base/logging";
import type { VideoMeta } from "./frame_server";
import { PngStreamParser } from "./png_stream";

const TAG = "[DecodeSession]";
const FFMPEG = ffmpegPath();
// Cached frames around the consumer; forward play + short backward scrub both hit.
const RING_MAX = 240;
const RING_EVICT_LOOKBACK = 90;
// Gap larger than this re-seeks instead of decoding through.
const FORWARD_WAIT_MAX = 90;
const FRAME_WAIT_TIMEOUT_MS = 5_000;

interface Waiter {
  resolve: (b: Buffer) => void;
  reject: (e: Error) => void;
  timer: NodeJS.Timeout;
}

// One video's decode pipeline: an ffmpeg child, an absolute-indexed frame ring, and re-seek control.
export class DecodeSession {
  private ffmpeg: ChildProcess | undefined;
  private parser = new PngStreamParser();
  private ring = new Map<number, Buffer>();
  private runBaseIdx = 0;
  private nextFrameIdx = 0;
  private waiters = new Map<number, Waiter>();
  private exhausted = false;

  constructor(
    readonly meta: VideoMeta,
    private readonly src: string,
    private readonly frameCount: number,
  ) {
    this.spawn(0);
  }

  // Absolute-indexed; empty buffer = past end. Backward/far jumps re-seek.
  async getFrame(idxRaw: number): Promise<Buffer> {
    const idx = Math.max(0, idxRaw);
    if (idx >= this.frameCount) return Buffer.alloc(0);
    const hit = this.ring.get(idx);
    if (hit) {
      this.onServe(idx);
      return hit;
    }
    if (this.needsReseek(idx)) this.reseek(idx);
    else if (this.exhausted && idx >= this.nextFrameIdx) return Buffer.alloc(0);
    return this.waitFrame(idx);
  }

  close(): void {
    this.killFfmpeg();
    this.rejectAllWaiters(new Error(`frame-server: session ${this.meta.id} closed`));
    this.ring.clear();
  }

  private needsReseek(idx: number): boolean {
    if (idx < this.runBaseIdx) return true; // before this run's first frame
    if (idx < this.nextFrameIdx) return true; // produced already but evicted from ring
    return idx > this.nextFrameIdx + FORWARD_WAIT_MAX; // too far ahead to wait out
  }

  private reseek(idx: number): void {
    this.killFfmpeg();
    this.rejectAllWaiters(new Error(`frame-server: superseded by re-seek to frame ${idx}`));
    this.spawn(idx);
  }

  private waitFrame(idx: number): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiters.delete(idx);
        reject(new Error(`frame-server: frame ${idx} not decoded within ${FRAME_WAIT_TIMEOUT_MS}ms`));
      }, FRAME_WAIT_TIMEOUT_MS);
      this.waiters.set(idx, { resolve, reject, timer });
      this.refillIfNeeded();
    });
  }

  private onServe(idx: number): void {
    const lo = idx - RING_EVICT_LOOKBACK;
    const hi = idx + RING_MAX;
    for (const k of this.ring.keys()) {
      if (k < lo || k > hi) this.ring.delete(k);
    }
    this.refillIfNeeded();
  }

  private refillIfNeeded(): void {
    const out = this.ffmpeg?.stdout;
    if (out && this.ring.size < RING_MAX && out.isPaused()) out.resume();
  }

  // `-ss` before `-i` is frame-accurate in modern ffmpeg.
  private spawn(fromIdx: number): void {
    this.parser = new PngStreamParser();
    this.runBaseIdx = fromIdx;
    this.nextFrameIdx = fromIdx;
    this.exhausted = false;
    const ssSec = fromIdx / this.meta.fps;
    const args = [
      "-hide_banner",
      "-loglevel",
      "error",
      ...(ssSec > 0 ? ["-ss", String(ssSec)] : []),
      "-i",
      this.src,
      "-vf",
      `fps=${this.meta.fps}`,
      "-color_range",
      "pc",
      "-colorspace",
      "bt709",
      "-color_primaries",
      "bt709",
      "-color_trc",
      "bt709",
      "-f",
      "image2pipe",
      "-c:v",
      "png",
      "-pix_fmt",
      "rgba",
      "-",
    ];
    logger.debug(TAG, `spawn id=${this.meta.id.slice(0, 8)} from=${fromIdx} ${this.meta.width}x${this.meta.height}`);
    const proc = spawn(FFMPEG, args, { stdio: ["ignore", "pipe", "pipe"] });
    this.ffmpeg = proc;
    proc.stdout!.on("data", (chunk: Buffer) => this.onStdout(chunk));
    proc.stderr!.on("data", (chunk: Buffer) =>
      logger.warn(TAG, `[${this.meta.id}] ffmpeg stderr:`, chunk.toString().trim()),
    );
    proc.on("error", (e) => logger.warn(TAG, `[${this.meta.id}] ffmpeg spawn error:`, e.message));
    proc.on("exit", (code) => {
      if (proc !== this.ffmpeg) return; // superseded by a re-seek
      logger.debug(TAG, `exit id=${this.meta.id.slice(0, 8)} code=${code} head=${this.nextFrameIdx}`);
      if (code === 0 || code === null) {
        this.exhausted = true;
        for (const [idx, w] of this.waiters) {
          if (idx >= this.nextFrameIdx) {
            clearTimeout(w.timer);
            this.waiters.delete(idx);
            w.resolve(Buffer.alloc(0));
          }
        }
      } else if (code !== 255) {
        this.rejectAllWaiters(new Error(`ffmpeg exited ${code} for ${this.src}`));
      }
    });
  }

  private onStdout(chunk: Buffer): void {
    for (const f of this.parser.feed(chunk)) {
      const idx = this.nextFrameIdx++;
      this.ring.set(idx, f);
      const waiter = this.waiters.get(idx);
      if (waiter) {
        this.waiters.delete(idx);
        clearTimeout(waiter.timer);
        waiter.resolve(f);
      }
    }
    if (this.ring.size >= RING_MAX) this.ffmpeg?.stdout?.pause();
  }

  private killFfmpeg(): void {
    if (!this.ffmpeg) return;
    this.ffmpeg.kill("SIGKILL");
    this.ffmpeg = undefined;
  }

  private rejectAllWaiters(err: Error): void {
    for (const w of this.waiters.values()) {
      clearTimeout(w.timer);
      w.reject(err);
    }
    this.waiters.clear();
  }
}
