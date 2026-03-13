// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/09.

import { program } from "commander";
import { pupUseInnerProxy } from "./base/constants";
import { logger } from "./base/logging";
import { noerr } from "./base/noerr";
import { parseNumber, parseString } from "./base/parser";
import { pargs } from "./base/process";
import {
  DEFAULT_DURATION,
  DEFAULT_FPS,
  DEFAULT_HEIGHT,
  DEFAULT_OUT_DIR,
  DEFAULT_WIDTH,
  isVideoFormat,
  RenderSchema,
  type RenderOptions,
} from "./renderer/schema";

export type CLICallback = (
  source: string,
  options: RenderOptions,
) => Promise<unknown>;

export async function makeCLI(name: string, callback: CLICallback) {
  const shape = RenderSchema.shape;
  program
    .name(name)
    .argument("<source>", "file://, http(s)://, 或 data: URI")
    .option("-W, --width <number>", shape.width.description, `${DEFAULT_WIDTH}`)
    .option(
      "-H, --height <number>",
      shape.height.description,
      `${DEFAULT_HEIGHT}`,
    )
    .option("-f, --fps <number>", shape.fps.description, `${DEFAULT_FPS}`)
    .option(
      "-t, --duration <number>",
      shape.duration.description,
      `${DEFAULT_DURATION}`,
    )
    .option(
      "-o, --out-dir <path>",
      shape.outDir.description,
      `${DEFAULT_OUT_DIR}`,
    )
    .option("-F, --formats <formats>", shape.formats.description, "mp4")
    .option("-a, --with-audio", shape.withAudio.description, false)
    .option(
      "--use-inner-proxy",
      shape.useInnerProxy.description,
      pupUseInnerProxy,
    )
    .option("-d, --deterministic", shape.deterministic.description, false)
    .action(async (source: string, opts) => {
      try {
        await callback(source, {
          width: noerr(parseNumber, DEFAULT_WIDTH)(opts.width),
          height: noerr(parseNumber, DEFAULT_HEIGHT)(opts.height),
          fps: noerr(parseNumber, DEFAULT_FPS)(opts.fps),
          duration: noerr(parseNumber, DEFAULT_DURATION)(opts.duration),
          outDir: opts.outDir ?? DEFAULT_OUT_DIR,
          formats: parseString(opts.formats)
            .split(",")
            .map((s) => s.trim())
            .filter(isVideoFormat),
          withAudio: opts.withAudio ?? false,
          useInnerProxy: opts.useInnerProxy ?? pupUseInnerProxy,
          deterministic: opts.deterministic ?? false,
        });
      } catch (e) {
        logger.fatal(e);
      }
    });
  await program.parseAsync(pargs());
}
