// Created by Autokaka (qq1909698494@gmail.com) on 2026/01/30.

import { app } from "electron";
import { electronOpts } from "./base/electron";
import { logger } from "./base/logging";
import { record } from "./base/record";
import { makeCLI } from "./common";

process.once("exit", () => app.quit());

const TAG = "[App]";

makeCLI("app", async (source, options) => {
  try {
    const opts = await electronOpts();
    opts.forEach((o) => {
      const eq = o.indexOf("=");
      if (eq < 0) {
        app.commandLine.appendSwitch(o);
      } else {
        const key = o.slice(0, eq);
        const value = o.slice(eq + 1);
        app.commandLine.appendSwitch(key, value);
      }
    });
    app.dock?.hide();
    await app.whenReady();
    app.once("gpu-info-update", () => {
      logger.debug(TAG, "gpu:", app.getGPUFeatureStatus());
    });
    await record(source, options);
  } finally {
    app.quit();
  }
});
