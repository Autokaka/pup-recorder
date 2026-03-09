// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/25.

import electron, { type Size } from "electron";
import { platform } from "process";
import { pupDisableGPU, pupLogLevel } from "./constants";
import { hasGpu } from "./hwaccel";
import { logger } from "./logging";
import { exec, PUP_ARGS_KEY } from "./process";

export async function electronOpts() {
  const opts = [
    // 容器沙箱
    "no-sandbox",
    "disable-dev-shm-usage",
    // 跨域/安全（录制场景需要加载任意资源）
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
  ];
  if (pupLogLevel < 3) {
    opts.push("log-level=3");
  }

  const enableGpu = (await hasGpu) && !pupDisableGPU;
  if (!enableGpu) {
    opts.push("use-angle=swiftshader", "enable-unsafe-swiftshader");
    return opts;
  }

  opts.push("disable-gpu-sandbox", "enable-unsafe-webgpu");
  if (process.platform === "darwin") {
    opts.push("use-angle=metal");
  } else if (process.platform === "win32") {
    opts.push("use-angle=d3d11");
  } else {
    opts.push(
      "use-angle=vulkan",
      "enable-features=Vulkan",
      "disable-vulkan-surface",
    );
  }
  return opts;
}

export interface ElectronAppOptions {
  size: Size;
  app: unknown;
  args: unknown[];
}

const TAG = "[Electron]";

export async function runElectronApp(options: ElectronAppOptions) {
  const { app, args, size } = options;
  const cmdParts: unknown[] = [];
  if (platform === "linux") {
    cmdParts.push(
      `xvfb-run`,
      `--auto-servernum`,
      `--server-args="-screen 0 ${size.width}x${size.height}x24"`,
    );
  }
  const opts = await electronOpts();
  const electronArgs = opts.map((a) => `--${a}`);
  const base64Args = Buffer.from(JSON.stringify(args)).toString("base64");
  electronArgs.push(`${PUP_ARGS_KEY}=${base64Args}`);
  cmdParts.push(electron, ...electronArgs, app);
  const cmd = cmdParts.join(" ");
  logger.debug(TAG, cmd);
  return exec(cmd, {
    stdio: ["ignore", "pipe", "pipe"],
    shell: platform === "linux",
    env: {
      ...process.env,
      RUST_BACKTRACE: "full",
    },
  });
}
