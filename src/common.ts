// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/09.

import { program } from "commander";
import { pupUseInnerProxy } from "./base/constants";
import { logger } from "./base/logging";
import { noerr } from "./base/noerr";
import { parseNumber } from "./base/parser";
import { pargs } from "./base/process";
import type { RecordOptions } from "./base/record";

export const DEFAULT_WIDTH = 1920;
export const DEFAULT_HEIGHT = 1080;
export const DEFAULT_FPS = 30;
export const DEFAULT_DURATION = 5;
export const DEFAULT_OUT_DIR = "out";

export type CLICallback = (
  source: string,
  options: RecordOptions & Record<string, unknown>,
) => Promise<unknown>;

export function makeCLI(name: string, callback: CLICallback) {
  program
    .name(name)
    .argument("<source>", "URL 或 HTML data")
    .option("-w, --width <number>", "视频宽度", `${DEFAULT_WIDTH}`)
    .option("-h, --height <number>", "视频高度", `${DEFAULT_HEIGHT}`)
    .option("-f, --fps <number>", "帧率", `${DEFAULT_FPS}`)
    .option("-t, --duration <number>", "录制时长（秒）", `${DEFAULT_DURATION}`)
    .option("-o, --out-dir <path>", "输出目录", `${DEFAULT_OUT_DIR}`)
    .option("-a, --with-alpha-channel", "输出包含 alpha 通道的视频", false)
    .option(
      "--use-inner-proxy",
      "使用 B 站内网代理加速资源访问",
      pupUseInnerProxy,
    )
    .action(async (source: string, opts) => {
      try {
        await callback(source, {
          width: noerr(parseNumber, DEFAULT_WIDTH)(opts.width),
          height: noerr(parseNumber, DEFAULT_HEIGHT)(opts.height),
          fps: noerr(parseNumber, DEFAULT_FPS)(opts.fps),
          duration: noerr(parseNumber, DEFAULT_DURATION)(opts.duration),
          outDir: opts.outDir ?? DEFAULT_OUT_DIR,
          withAlphaChannel: opts.withAlphaChannel ?? false,
          useInnerProxy: opts.useInnerProxy ?? pupUseInnerProxy,
        });
      } catch (e) {
        logger.fatal(e);
      }
    });
  program.parse(pargs());
}
