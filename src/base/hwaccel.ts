// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/27.

import { readdir } from "fs/promises";
import { platform } from "os";
import { graphics } from "systeminformation";
import { logger } from "./logging";

const TAG = "[HWAccel]";

const softwareVendors = ["microsoft", "vmware", "virtualbox", "llvmpipe", "softpipe", "swiftshader"];

function isSoftwareRenderer(vendor: string) {
  const lower = vendor.toLowerCase();
  return softwareVendors.some((v) => lower.includes(v));
}

async function detectGPUDriver() {
  const { controllers } = await graphics();
  if (platform() === "linux") {
    try {
      const files = await readdir("/dev/dri");
      return files.some((f) => f.startsWith("renderD"));
    } catch {
      return false;
    }
  }
  logger.debug(TAG, "GPU controllers:", controllers);
  return controllers.some((c) => c.vendor.length > 0 && !isSoftwareRenderer(c.vendor));
}

export const canIUseGPU = detectGPUDriver().then((result) => {
  logger.debug(TAG, "gpu:", result);
  return result;
});
