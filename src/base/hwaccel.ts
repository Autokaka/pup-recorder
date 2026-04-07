// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/27.

import { HardwareContext } from "node-av/api";
import { logger } from "./logging";

const TAG = "[HWAccel]";

async function detectGPUDriver() {
  const hw = HardwareContext.auto();
  const result = hw !== null;
  hw?.dispose();
  return result;
}

export const canIUseGPU = detectGPUDriver().then((result) => {
  logger.debug(TAG, "gpu:", result);
  return result;
});
