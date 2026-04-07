// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/03.

import { platform } from "os";
import { pupDisableGPU, pupLogLevel } from "./constants";
import { canIUseGPU } from "./hwaccel";

export async function chromiumOptions() {
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
