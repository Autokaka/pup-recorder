// Created by Autokaka (qq1909698494@gmail.com) on 2026/01/30.

import { ok } from "assert";
import { app } from "electron";
import { rmSync } from "fs";
import { tmpdir } from "os";
import { dirname } from "path";
import { logger } from "./base/logging";
import { makeCLI } from "./common";
import { render } from "./renderer/render";
import { shoot } from "./renderer/shoot";

const TAG = "[App]";

function printFeatures() {
  logger.debug(TAG, "gpu features:", app.getGPUFeatureStatus());
}

app.dock?.hide();
app.on("window-all-closed", () => {});

makeCLI("app", async (source, options) => {
  const outDir = dirname(options.outFile);
  ok(outDir.startsWith(tmpdir()), "Output directory must be inside the system temporary directory");

  const exit = (code: number) => {
    app.quit();
    code && rmSync(outDir, { recursive: true, force: true });
    process.exit(code);
  };
  process.once("SIGTERM", () => exit(143));
  process.once("SIGINT", () => exit(130));
  process.once("exit", (c) => exit(c));
  try {
    app.on("gpu-info-update", printFeatures);
    await app.whenReady();
    printFeatures();
    const action = options.deterministic ? shoot : render;
    await action(source, options);
  } finally {
    app.quit();
  }
});
