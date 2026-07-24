// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/27.

import { HardwareContext } from "node-av/api";
import { Lazy } from "./lazy";
import { logger } from "./logging";

const TAG = "[HWAccel]";

// Lazy: eager auto() dlopens libcuda at import, whose init thread can SEGV GPU-less pods (2026-07-24 exit-132 storm).
export const canIUseGPU = new Lazy(() => {
  using hw = HardwareContext.auto();
  const result = hw !== null;
  logger.debug(TAG, "gpu:", result);
  return result;
});
