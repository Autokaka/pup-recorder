// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/25.

import { logger } from "./base/logging";
import { makeCLI } from "./common";
import { pup } from "./pup";

const TAG = "pup";

makeCLI({
  name: "pup",
  run: async (source, options) => {
    const ctrl = new AbortController();
    let exitCode = 0;
    process.once("SIGTERM", () => ((exitCode = 143), ctrl.abort(new Error("SIGTERM"))));
    process.once("SIGINT", () => ((exitCode = 130), ctrl.abort(new Error("SIGINT"))));
    process.once("exit", (c) => ((exitCode = c), ctrl.abort(new Error("SIGKILL"))));
    try {
      await pup(source, { ...options, signal: ctrl.signal });
    } catch (e) {
      logger.error(TAG, e);
    } finally {
      process.exit(exitCode);
    }
  },
});
