// Created by Autokaka (qq1909698494@gmail.com) on 2026/01/30.

import { app } from "electron";
import { logger } from "./base/logging";
import { makeCLI } from "./common";
import { render } from "./renderer/render";

process.once("exit", () => app.quit());

const TAG = "[App]";

function printFeatures() {
  logger.debug(TAG, "gpu features:", app.getGPUFeatureStatus());
}

app.dock?.hide();

makeCLI("app", async (source, options) => {
  try {
    app.on("gpu-info-update", printFeatures);
    await app.whenReady();
    printFeatures();
    await render(source, options);
  } finally {
    app.quit();
  }
});
