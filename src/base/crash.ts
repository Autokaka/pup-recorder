// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/21.

import { app, crashReporter } from "electron";
import { mkdirSync } from "fs";
import { join } from "path";
import { logger } from "./logging";

const TAG = "[Crash]";

export function startElectronCrashReporter() {
  // appData (not the per-run user-data-dir) so every pup app's dumps accumulate in one shared, persistent dir.
  const dumpDir = join(app.getPath("appData"), "pup-recorder", "crashes");
  mkdirSync(dumpDir, { recursive: true });
  app.setPath("crashDumps", dumpDir);
  crashReporter.start({
    productName: "pup-recorder",
    uploadToServer: false,
    compress: false,
    ignoreSystemCrashHandler: true,
  });
  logger.debug(TAG, "set dump to", dumpDir);
}
