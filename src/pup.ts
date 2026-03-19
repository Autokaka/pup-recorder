// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/09.

import { readFile } from "fs/promises";
import { join } from "path";
import { AbortLink, type AbortQuery } from "./base/abort";
import { ConcurrencyLimiter } from "./base/limiter";
import { logger } from "./base/logging";
import { parseNumber } from "./base/parser";
import { runElectronApp } from "./renderer/electron";
import { DEFAULT_HEIGHT, DEFAULT_WIDTH, type RenderOptions, type RenderResult } from "./renderer/schema";

const TAG = "[pup]";
const PROGRESS_TAG = " progress: ";

export type PupProgressCallback = (progress: number) => Promise<void> | void;

export interface PupOptions extends Partial<RenderOptions> {
  cancelQuery?: AbortQuery;
  onProgress?: PupProgressCallback;
}

export interface PupResult extends RenderResult {}

async function runPupApp(source: string, options: PupOptions) {
  logger.debug(TAG, `runPupApp`, source, options);

  const args: string[] = [source];
  if (options.width) args.push("--width", `${options.width}`);
  if (options.height) args.push("--height", `${options.height}`);
  if (options.fps) args.push("--fps", `${options.fps}`);
  if (options.duration) args.push("--duration", `${options.duration}`);
  if (options.outDir) args.push("--out-dir", options.outDir);
  if (options.formats?.length) args.push("--formats", options.formats.join(","));
  if (options.withAudio) args.push("--with-audio");
  if (options.useInnerProxy) args.push("--use-inner-proxy");
  if (options.deterministic) args.push("--deterministic");

  const w = options.width ?? DEFAULT_WIDTH;
  const h = options.height ?? DEFAULT_HEIGHT;
  const handle = await runElectronApp({ width: w, height: h }, args);
  const counter = new ConcurrencyLimiter(1);
  handle.process.stdout?.on("data", (data: Buffer) => {
    let message = data.toString().trim();
    let start = message.indexOf(PROGRESS_TAG);
    if (start < 0) {
      return;
    }
    message = message.slice(start + PROGRESS_TAG.length);
    const end = message.indexOf("%");
    if (end < 0) {
      return;
    }
    const progressStr = message.slice(0, end);
    const progress = parseNumber(progressStr);
    counter.schedule(async () => {
      await options.onProgress?.(progress);
    });
  });
  return { handle, counter };
}

export async function pup(source: string, options: PupOptions): Promise<PupResult> {
  logger.debug(TAG, `pup`, source, options);

  const link = AbortLink.start(options.cancelQuery);
  const outDir = options.outDir ?? "out";

  const t0 = performance.now();
  const { handle, counter } = await runPupApp(source, { ...options, outDir });

  await link.wait(handle);
  await counter.end();
  link.stop();
  logger.info(TAG, `done in ${Math.round(performance.now() - t0)}ms`);

  const sumPath = join(outDir, "summary.json");
  return JSON.parse(await readFile(sumPath, "utf-8")) as RenderResult;
}
