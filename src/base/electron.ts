// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/25.

import electron, { type Size } from "electron";
import { platform } from "process";
import { pupDisableGPU } from "./constants";
import { hasGpu } from "./hwaccel";
import { logger } from "./logging";
import { exec, PUP_ARGS_KEY } from "./process";

const ELECTRON_OPTS_BASE = [
  "no-sandbox",
  "disable-setuid-sandbox",
  "disable-dev-shm-usage",
  "disable-web-security",
  "disable-site-isolation-trials",
  "disable-features=IsolateOrigins,site-per-process",
  "allow-insecure-localhost",
  "ignore-certificate-errors",
  "disable-blink-features=AutomationControlled",
  "mute-audio",
  "disable-extensions",
  "disable-background-networking",
  "address-family=ipv4",
  "disable-async-dns",
  "force-device-scale-factor=1",
  "trace-warnings",
  "force-color-profile=srgb",
  "disable-color-correct-rendering",
  "log-level=3",
  "ignore-gpu-blocklist",
  "gpu-shader-disk-cache-size-kb=524288",
];

export const ELECTRON_OPTS = [
  ...ELECTRON_OPTS_BASE,
  "use-gl=angle",
  "use-angle=swiftshader",
  "enable-unsafe-swiftshader",
];

export const ELECTRON_OPTS_GPU = [
  ...ELECTRON_OPTS_BASE,
  "in-process-gpu",
  "use-gl=angle",
  process.platform === "darwin"
    ? "use-angle=metal"
    : process.platform === "win32"
      ? "use-angle=d3d11"
      : "use-angle=vulkan",
];

export interface ElectronAppOptions {
  size: Size;
  app: unknown;
  args: unknown[];
}

const TAG = "[Electron]";

export async function runElectronApp(options: ElectronAppOptions) {
  const { size, app, args } = options;
  const cmdParts = [];
  if (platform === "linux") {
    cmdParts.push(
      "xvfb-run",
      "--auto-servernum",
      `--server-args='-screen 0 ${size.width}x${size.height}x24'`,
    );
  }
  const enableGpu = (await hasGpu) && !pupDisableGPU;
  const opts = enableGpu ? ELECTRON_OPTS_GPU : ELECTRON_OPTS;
  logger.debug(TAG, "opts", opts);
  const electronArgs = opts.map((a) => `--${a}`);
  const base64Args = Buffer.from(JSON.stringify(args)).toString("base64");
  electronArgs.push(`${PUP_ARGS_KEY}=${base64Args}`);
  cmdParts.push(electron, ...electronArgs, app);
  return exec(cmdParts.join(" "), {
    stdio: ["ignore", "pipe", "pipe"],
    shell: platform === "linux",
    env: { ...process.env, ELECTRON_DISABLE_DBUS: "1", RUST_BACKTRACE: "full" },
  });
}
