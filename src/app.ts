// Created by Autokaka (qq1909698494@gmail.com) on 2026/01/30.

import { ok } from "assert";
import { app } from "electron";
import { mkdir } from "fs/promises";
import { dirname } from "path";
import { startElectronCrashReporter } from "./base/crash";
import { logger } from "./base/logging";
import { makeCLI } from "./common";
import { IpcWriter } from "./renderer/ipc";
import { setupPupProtocol } from "./renderer/protocol";
import { render } from "./renderer/render";
import { defaultRenderOptions } from "./renderer/schema";
import { shoot } from "./renderer/shoot";

const TAG = "[App]";

startElectronCrashReporter();

function printFeatures() {
  logger.debug(TAG, "gpu features:", app.getGPUFeatureStatus());
}

app.dock?.hide();
app.on("window-all-closed", () => {});

makeCLI({
  name: "app",
  defaults: {
    ...defaultRenderOptions,
    withAudio: false,
    deterministic: false,
    useInnerProxy: false,
    disableGpu: false,
    disableHwCodec: false,
    windowTolerant: false,
  },
  run: async (source, options) => {
    const exit = (code: number) => {
      app.quit();
      process.exit(code);
    };
    process.once("SIGTERM", () => exit(143));
    process.once("SIGINT", () => exit(130));
    process.once("exit", (c) => exit(c));
    ok(process.send, "ipc channel missing — spawn with stdio[3]='ipc'");
    const ipc = new IpcWriter();
    try {
      app.on("gpu-info-update", printFeatures);
      await app.whenReady();
      setupPupProtocol();
      printFeatures();
      await mkdir(dirname(options.outFile), { recursive: true });
      const action = options.deterministic ? shoot : render;
      await ipc.writeDone(await action(ipc, source, options));
    } catch (e) {
      const error = e as Error;
      const m = error.stack ?? error.message ?? String(e ?? "unknown error");
      await ipc.writeError(m);
    } finally {
      app.exit();
    }
  },
});
