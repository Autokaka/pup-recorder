// Created by Autokaka (qq1909698494@gmail.com) on 2026/01/30.

import { ok } from "node:assert";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { app, Menu } from "electron";
import { startElectronCrashReporter } from "./base/crash";
import { logger } from "./base/logging";
import { makeCLI } from "./common";
import { type IpcMsg, IpcMsgType, IpcWriter } from "./renderer/ipc";
import { setupPupProtocol } from "./renderer/protocol";
import { render } from "./renderer/render";
import { withRerender } from "./renderer/rerender";
import { shoot } from "./renderer/shoot";
import { setupFrameProtocol } from "./renderer/video/protocol";

const TAG = "[App]";

function printFeatures() {
  logger.debug(TAG, "gpu features:", app.getGPUFeatureStatus());
}

const ctrl = new AbortController();
let exiting = false;

startElectronCrashReporter();
Menu.setApplicationMenu(null);
app.dock?.hide();
app.on("window-all-closed", () => {});
app.on("gpu-info-update", printFeatures);
app.on("before-quit", (e) => !exiting && e.preventDefault());
app.on("will-quit", (e) => !exiting && e.preventDefault());

ok(process.send, "ipc channel missing — spawn with stdio[3]='ipc'");
process.once("disconnect", () => ctrl.abort("disconnect"));
process.on("message", (raw) => {
  const msg = raw as IpcMsg;
  if (msg.type === IpcMsgType.Cancel) {
    ctrl.abort(msg.reason);
  }
});

makeCLI({
  name: "app",
  run: async (source, options) => {
    const ipc = new IpcWriter();
    try {
      await app.whenReady();
      setupPupProtocol();
      setupFrameProtocol();
      printFeatures();
      for (const out of options.outFile.split(",")) {
        await mkdir(dirname(out), { recursive: true });
      }
      const action = options.deterministic ? shoot : render;
      ctrl.signal.throwIfAborted();
      const result = await withRerender(ctrl.signal, () =>
        action({
          source,
          ...options,
          signal: ctrl.signal,
          onProgress: (p) => ipc.writeProgress(p),
          onConsole: (l, m) => ipc.writeConsole(l, m),
        }),
      );
      await ipc.writeDone(result);
    } catch (e) {
      const error = e as Error;
      const m = error.stack ?? error.message ?? String(e ?? "unknown error");
      await ipc.writeError(m);
    } finally {
      exiting = true;
      app.exit();
    }
  },
});
