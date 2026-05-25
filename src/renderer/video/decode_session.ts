// Created by Lu Ao (luao@bilibili.com) on 2026/05/18.

import { spawn, type ChildProcess } from "child_process";
import { mkdir, readdir, readFile, rm } from "fs/promises";
import { ffmpegPath } from "node-av/ffmpeg";
import { join } from "path";
import { logger } from "../../base/logging";
import type { VideoMeta } from "./frame_server";

const TAG = "[DecodeSession]";
const WAIT_TIMEOUT_MS = 5_000;
const POLL_INTERVAL_MS = 20;

interface Waiter {
  resolve: (b: Buffer) => void;
  timer: NodeJS.Timeout;
}

export class DecodeSession {
  private proc: ChildProcess | undefined;
  private ready = 0;
  private done = false;
  private waiters = new Set<{ idx: number; w: Waiter }>();
  private watcher: NodeJS.Timeout | undefined;

  constructor(
    readonly meta: VideoMeta,
    private readonly src: string,
    private readonly framesDir: string,
  ) {
    void this.spawn();
  }

  async getFrame(idx: number): Promise<Buffer> {
    if (idx < 1) idx = 1;
    const path = join(this.framesDir, `${pad6(idx)}.png`);
    try {
      return await readFile(path);
    } catch {
      // not yet on disk
    }
    if (this.done && this.ready < idx) return Buffer.alloc(0);
    return this.wait(idx);
  }

  close(): void {
    if (this.proc) {
      this.proc.kill("SIGKILL");
      this.proc = undefined;
    }
    if (this.watcher) {
      clearInterval(this.watcher);
      this.watcher = undefined;
    }
    for (const { w } of this.waiters) {
      clearTimeout(w.timer);
      w.resolve(Buffer.alloc(0));
    }
    this.waiters.clear();
    void rm(this.framesDir, { recursive: true, force: true });
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

  private async spawn(): Promise<void> {
    await mkdir(this.framesDir, { recursive: true });
    const fps = this.meta.fps;
    const pattern = join(this.framesDir, "%06d.png");
    const proc = spawn(
      ffmpegPath(),
      [
        "-loglevel",
        "error",
        "-y",
        "-i",
        this.src,
        "-vf",
        `fps=${fps}`,
        "-pix_fmt",
        "rgba",
        "-compression_level",
        "1",
        "-pred",
        "none",
        pattern,
      ],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    this.proc = proc;
    proc.stderr?.on("data", (b: Buffer) => logger.warn(TAG, `[${this.meta.id.slice(0, 8)}] ${b.toString().trim()}`));
    proc.on("exit", () => {
      this.done = true;
      this.poll();
      this.drainWaiters();
    });
    this.watcher = setInterval(() => this.poll(), POLL_INTERVAL_MS);
  }

  private async poll(): Promise<void> {
    try {
      const entries = await readdir(this.framesDir);
      let max = 0;
      for (const name of entries) {
        if (!name.endsWith(".png")) continue;
        const n = parseInt(name.slice(0, -4), 10);
        if (n > max) max = n;
      }
      if (max <= this.ready) return;
      this.ready = max;
      this.drainWaiters();
    } catch {
      // dir may not exist yet
    }
  }

  private drainWaiters(): void {
    for (const entry of [...this.waiters]) {
      if (entry.idx <= this.ready) {
        this.waiters.delete(entry);
        clearTimeout(entry.w.timer);
        void readFile(join(this.framesDir, `${pad6(entry.idx)}.png`))
          .then((buf) => entry.w.resolve(buf))
          .catch(() => entry.w.resolve(Buffer.alloc(0)));
      } else if (this.done) {
        this.waiters.delete(entry);
        clearTimeout(entry.w.timer);
        entry.w.resolve(Buffer.alloc(0));
      }
    }
  }
}

function pad6(n: number): string {
  return n.toString().padStart(6, "0");
}
