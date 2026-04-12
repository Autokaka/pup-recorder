// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/25.

import electron, { type Size } from "electron";
import { platform } from "os";
import { chromiumOptions } from "../base/chromium";
import { pupApp } from "../base/constants";
import { logger } from "../base/logging";
import { exec, PUP_ARGS_KEY } from "../base/process";

export async function electronOpts(disableGpu: boolean) {
  return [...(await chromiumOptions(disableGpu)), "headless=new"];
}

const TAG = "[Electron]";

export async function runElectronApp(size: Size, args: unknown[], ipcSocketPath: string) {
  const cmdParts: unknown[] = [];
  const plat = platform();
  if (plat === "linux") {
    cmdParts.push(`xvfb-run`, `--auto-servernum`, `--server-args="-screen 0 ${size.width}x${size.height}x24"`);
  }
  const opts = await electronOpts(args.includes("--disable-gpu"));
  const electronArgs = opts.map((a) => `--${a}`);
  const base64Args = Buffer.from(JSON.stringify(args)).toString("base64");
  electronArgs.push(`${PUP_ARGS_KEY}=${base64Args}`);
  cmdParts.push(electron, ...electronArgs, pupApp);
  const cmd = cmdParts.join(" ");
  logger.debug(TAG, cmd);
  return exec(cmd, {
    stdio: ["ignore", "pipe", "pipe"],
    shell: plat === "linux",
    env: { ...process.env, RUST_BACKTRACE: "full", PUP_IPC_SOCKET: ipcSocketPath },
  });
}
