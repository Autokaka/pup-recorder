// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/03.

import { platform } from "os";
import { pupLogLevel } from "./constants";
import { canIUseGPU } from "./hwaccel";

export async function chromiumOptions(disableGpu: boolean) {
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
    // https://github.com/puppeteer/puppeteer/issues/2410
    "font-render-hinting=none",
    // 资源控制
    "disable-background-networking",
    "js-flags=--max-old-space-size=512",
    "renderer-process-limit=1",
    "num-raster-threads=1",
    "disable-background-timer-throttling",
    "disable-renderer-backgrounding",
    "disable-backgrounding-occluded-windows",
  ];

  if (pupLogLevel < 3) {
    opts.push("log-level=3");
  }

  const features = ["FontationBackend"];
  const enableGpu = (await canIUseGPU) && !disableGpu;
  if (!enableGpu) {
    opts.push("use-angle=swiftshader", "enable-unsafe-swiftshader");
  } else {
    opts.push("disable-gpu-sandbox", "enable-unsafe-webgpu");
    const plat = platform();
    if (plat === "darwin") {
      opts.push("use-angle=metal");
    } else if (plat === "win32") {
      opts.push("use-angle=d3d11");
    } else {
      opts.push("use-angle=vulkan", "disable-vulkan-surface");
      features.push("Vulkan");
    }
  }

  opts.push(`enable-features=${features.join(",")}`);
  return opts;
}
