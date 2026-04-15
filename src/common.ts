// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/09.

import { program } from "commander";
import { logger } from "./base/logging";
import { noerr } from "./base/noerr";
import { parseNumber } from "./base/parser";
import { pargs } from "./base/process";
import { RenderSchema, type RenderOptions } from "./renderer/schema";

export interface CLIOptions {
  name: string;
  defaults: RenderOptions;
  run: (source: string, options: RenderOptions) => Promise<unknown>;
}

export async function makeCLI(options: CLIOptions) {
  const shape = RenderSchema.shape;
  const d = options.defaults;
  program
    .name(options.name)
    .argument("<source>", "file://, http(s)://, or data: URI")
    .option("-W, --width <number>", shape.width.description, `${d.width}`)
    .option("-H, --height <number>", shape.height.description, `${d.height}`)
    .option("-f, --fps <number>", shape.fps.description, `${d.fps}`)
    .option("-t, --duration <number>", shape.duration.description, `${d.duration}`)
    .option("-o, --out-file <path>", shape.outFile.description, d.outFile)
    .option("-a, --with-audio", shape.withAudio.description, d.withAudio)
    .option("-d, --deterministic", shape.deterministic.description, d.deterministic)
    .option("--use-inner-proxy", shape.useInnerProxy.description, d.useInnerProxy)
    .option("--disable-gpu", shape.disableGpu.description, d.disableGpu)
    .option("--disable-hw-codec", shape.disableHwCodec.description, d.disableHwCodec)
    .option("--window-tolerant", shape.windowTolerant.description, d.windowTolerant)
    .action(async (source: string, opts) => {
      try {
        await options.run(source, {
          width: noerr(parseNumber, d.width)(opts.width),
          height: noerr(parseNumber, d.height)(opts.height),
          fps: noerr(parseNumber, d.fps)(opts.fps),
          duration: noerr(parseNumber, d.duration)(opts.duration),
          outFile: opts.outFile ?? d.outFile,
          withAudio: opts.withAudio ?? d.withAudio,
          useInnerProxy: opts.useInnerProxy ?? d.useInnerProxy,
          deterministic: opts.deterministic ?? d.deterministic,
          disableGpu: opts.disableGpu ?? d.disableGpu,
          disableHwCodec: opts.disableHwCodec ?? d.disableHwCodec,
          windowTolerant: opts.windowTolerant ?? d.windowTolerant,
        });
      } catch (e) {
        logger.fatal(e);
      }
    });
  await program.parseAsync(pargs());
}
