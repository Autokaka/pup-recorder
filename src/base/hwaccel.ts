// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/27.

import { graphics } from "systeminformation";
import { logger } from "./logging";

const TAG = "[HWAccel]";

async function detect() {
  const { controllers } = await graphics();
  return controllers.some((c) => c.vendor.length);
}

export const hasGpu = detect().then((gpu) => {
  logger.debug(TAG, "GPU detected:", gpu);
  return gpu;
});
