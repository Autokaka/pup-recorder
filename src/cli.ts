// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/25.

import { barLogger, ProgressBar } from "./base/cli_ui";
import { logger } from "./base/logging";
import { makeCLI } from "./common";
import { pup } from "./pup";

makeCLI({
  name: "pup",
  run: async (source, options) => {
    const ctrl = new AbortController();
    let exitCode = 0;
    process.once("SIGTERM", () => {
      exitCode = 143;
      ctrl.abort(new Error("SIGTERM"));
    });
    process.once("SIGINT", () => {
      exitCode = 130;
      ctrl.abort(new Error("SIGINT"));
    });
    process.once("exit", (c) => {
      exitCode = c;
      ctrl.abort(new Error("SIGKILL"));
    });

    const total = Math.ceil(options.fps * options.duration);
    const bar = new ProgressBar({ total, out: process.stderr, showCount: true });
    logger.impl = barLogger(bar);

    const t0 = performance.now();
    try {
      const { screenshots, outFiles } = await pup(source, {
        ...options,
        signal: ctrl.signal,
        onProgress: (p) => bar.updatePercent(p),
      });
      const sec = ((performance.now() - t0) / 1000).toFixed(2);
      bar.update(total);
      if (screenshots.length) {
        bar.log(`screenshots → ${screenshots.join(",")}`);
      }
      if (outFiles.length) {
        bar.log(`videos → ${outFiles.join(",")}`);
      }
      bar.finish(`summary → ${total} frames, ${options.width}x${options.height} @ ${options.fps}fps in ${sec}s`);
    } catch (e) {
      bar.finish(`error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      process.exit(exitCode);
    }
  },
});
