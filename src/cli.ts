// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/25.

import { makeCLI } from "./common";
import { pup } from "./pup";
import { defaultRenderOptions } from "./renderer/schema";

makeCLI({
  name: "pup",
  defaults: defaultRenderOptions,
  run: async (source, options) => {
    const ctrl = new AbortController();
    let exitCode = 0;
    process.once("SIGTERM", () => ((exitCode = 143), ctrl.abort()));
    process.once("SIGINT", () => ((exitCode = 130), ctrl.abort()));
    process.once("exit", (c) => ((exitCode = c), ctrl.abort()));
    try {
      await pup(source, { ...options, signal: ctrl.signal });
    } finally {
      exitCode && process.exit(exitCode);
    }
  },
});
