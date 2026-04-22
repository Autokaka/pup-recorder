// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/21.

import { app, crashReporter } from "electron";
import { mkdirSync } from "fs";
import { join } from "path";
import { logger } from "./logging";

const TAG = "[Crash]";

export function startElectronCrashReporter() {
  const dumpDir = join(app.getPath("userData"), "crashes");
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
