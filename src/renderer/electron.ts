// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/25.

import { rmSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromiumOptions } from "../base/chromium";
import { pupApp } from "../base/constants";
import { logger } from "../base/logging";
import { exec, PUP_ARGS_KEY } from "../base/process";

export async function electronOpts(disableGpu: boolean) {
  return [...(await chromiumOptions(disableGpu)), "headless=new"];
}

const TAG = "[Electron]";

export interface RunElectronAppOptions {
  args: unknown[];
}

export async function runElectronApp({ args }: RunElectronAppOptions) {
  // Lazy: electron's entry throws if the binary is absent, so util-only consumers must not load it at import time.
  const { default: electron } = await import("electron");
  const opts = await electronOpts(args.includes("--disable-gpu"));
  // Per-process profile: isolates this call's Chromium cache (warmup windows share it via defaultSession), wiped on exit.
  const profileDir = await mkdtemp(join(tmpdir(), "pup-profile-"));
  const electronArgs = opts.map((a) => `--${a}`);
  electronArgs.push(`--user-data-dir=${profileDir}`);
  electronArgs.push(`${PUP_ARGS_KEY}=${Buffer.from(JSON.stringify(args)).toString("base64")}`);
  const cmd = [electron, ...electronArgs, pupApp].join(" ");
  logger.debug(TAG, cmd);

  const env: NodeJS.ProcessEnv = { ...process.env, RUST_BACKTRACE: "full" };
  const handle = exec(cmd, { stdio: ["ignore", "pipe", "pipe", "ipc"], env });
  handle.process.once("exit", () => {
    try {
      rmSync(profileDir, { recursive: true, force: true });
    } catch (e) {
      logger.warn(TAG, "profile cleanup failed:", e);
    }
  });
  return handle;
}
