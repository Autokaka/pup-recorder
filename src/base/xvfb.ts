// Created by Lu Ao (luao@bilibili.com) on 2026/04/21.

import { spawn } from "child_process";
import { closeSync, existsSync, openSync, readFileSync, rmSync } from "fs";
import treeKill from "tree-kill";

export interface XvfbHandle {
  display: number;
  stop(): void;
}

function acquireDisplay(): number {
  for (let n = 99; n < 900; n++) {
    const lock = `/tmp/.X${n}-lock`;
    if (existsSync(lock)) {
      if (!staleLock(lock)) continue;
      rmSync(lock, { force: true });
    }
    try {
      closeSync(openSync(lock, "wx"));
      return n;
    } catch {}
  }
  throw new Error("no free X display");
}

function staleLock(lock: string): boolean {
  try {
    const pid = Number.parseInt(readFileSync(lock, "utf8").trim(), 10);
    if (!Number.isFinite(pid)) return true;
    process.kill(pid, 0);
    return false;
  } catch {
    return true;
  }
}

export function startXvfb(width: number, height: number): XvfbHandle {
  const display = acquireDisplay();
  const proc = spawn("Xvfb", [`:${display}`, "-screen", "0", `${width}x${height}x24`, "-nolisten", "tcp", "-noreset"], {
    stdio: "ignore",
  });
  return {
    display,
    stop() {
      if (proc.pid) treeKill(proc.pid, "SIGKILL");
      rmSync(`/tmp/.X${display}-lock`, { force: true });
      rmSync(`/tmp/.X11-unix/X${display}`, { force: true });
    },
  };
}
