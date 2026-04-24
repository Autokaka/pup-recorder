// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/25.

import electron from "electron";
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
  const opts = await electronOpts(args.includes("--disable-gpu"));
  const electronArgs = opts.map((a) => `--${a}`);
  electronArgs.push(`${PUP_ARGS_KEY}=${Buffer.from(JSON.stringify(args)).toString("base64")}`);
  const cmd = [electron, ...electronArgs, pupApp].join(" ");
  logger.debug(TAG, cmd);

  const env: NodeJS.ProcessEnv = { ...process.env, RUST_BACKTRACE: "full" };
  return exec(cmd, { stdio: ["ignore", "pipe", "pipe", "ipc"], env });
}
