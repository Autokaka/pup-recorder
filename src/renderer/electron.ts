// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/25.

import { ok } from "assert";
import electron, { type Size } from "electron";
import { stat } from "fs/promises";
import { platform } from "os";
import { fileURLToPath } from "url";
import { pupApp, pupDisableGPU, pupLogLevel } from "../base/constants";
import { canIUseGPU } from "../base/hwaccel";
import { logger } from "../base/logging";
import { exec, PUP_ARGS_KEY } from "../base/process";

export async function electronOpts() {
  const opts = [
    // 容器沙箱
    "no-sandbox",
    "disable-dev-shm-usage",
    // 跨域/安全
    "disable-web-security",
    "disable-site-isolation-trials",
    "ignore-certificate-errors",
    // 录制行为
    "disable-blink-features=AutomationControlled",
    "mute-audio",
    "autoplay-policy=no-user-gesture-required",
    "disable-extensions",
    // 渲染
    "headless=new",
    "force-device-scale-factor=1",
    "force-color-profile=srgb",
    "ignore-gpu-blocklist",
    "use-gl=angle",
    "deterministic-mode",
    "enable-begin-frame-control",
    "disable-new-content-rendering-timeout",
    "run-all-compositor-stages-before-draw",
    "disable-threaded-animation",
    "disable-threaded-scrolling",
    "disable-checker-imaging",
    "disable-image-animation-resync",
    "enable-surface-synchronization",
    // 资源控制
    "disable-background-networking",
  ];
  if (pupLogLevel < 3) {
    opts.push("log-level=3");
  }

  const enableGpu = (await canIUseGPU) && !pupDisableGPU;
  if (!enableGpu) {
    opts.push("use-angle=swiftshader", "enable-unsafe-swiftshader");
    return opts;
  }

  opts.push("disable-gpu-sandbox", "enable-unsafe-webgpu");
  const plat = platform();
  if (plat === "darwin") {
    opts.push("use-angle=metal");
  } else if (plat === "win32") {
    opts.push("use-angle=d3d11");
  } else {
    opts.push("use-angle=vulkan", "enable-features=Vulkan", "disable-vulkan-surface");
  }
  return opts;
}

const TAG = "[Electron]";

async function assertAppFresh() {
  const [appStat, selfStat] = await Promise.all([stat(pupApp), stat(fileURLToPath(import.meta.url))]);
  ok(appStat.mtimeMs >= selfStat.mtimeMs, `app.cjs is stale, run \`bun run build\``);
}

export async function runElectronApp(size: Size, args: unknown[]) {
  await assertAppFresh();
  const cmdParts: unknown[] = [];
  const plat = platform();
  if (plat === "linux") {
    cmdParts.push(`xvfb-run`, `--auto-servernum`, `--server-args="-screen 0 ${size.width}x${size.height}x24"`);
  }
  const opts = await electronOpts();
  const electronArgs = opts.map((a) => `--${a}`);
  const base64Args = Buffer.from(JSON.stringify(args)).toString("base64");
  electronArgs.push(`${PUP_ARGS_KEY}=${base64Args}`);
  cmdParts.push(electron, ...electronArgs, pupApp);
  const cmd = cmdParts.join(" ");
  logger.debug(TAG, cmd);
  return exec(cmd, {
    stdio: ["ignore", "pipe", "pipe"],
    shell: plat === "linux",
    env: { ...process.env, RUST_BACKTRACE: "full" },
  });
}
