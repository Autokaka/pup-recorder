// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/09.

import { randomUUID } from "crypto";
import { rmSync } from "fs";
import { readFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import treeKill from "tree-kill";
import { logger } from "./base/logging";
import { parseNumber } from "./base/parser";
import { encodeBgra } from "./renderer/bgra";
import { runElectronApp } from "./renderer/electron";
import {
  DEFAULT_HEIGHT,
  DEFAULT_OUT_FILE,
  DEFAULT_WIDTH,
  type RenderOptions,
  type RenderResult,
} from "./renderer/schema";

const TAG = "[pup]";
const PROGRESS_TAG = " progress: ";

export type PupProgressCallback = (progress: number) => Promise<void> | void;

export interface PupOptions extends Partial<RenderOptions> {
  signal?: AbortSignal;
  onProgress?: PupProgressCallback;
}

export interface PupResult extends RenderResult {}

const RECORD_WEIGHT = 0.5;

async function runPupApp(source: string, options: PupOptions) {
  logger.debug(TAG, `runPupApp`, source, options);

  const args: string[] = [source];
  if (options.width) args.push("--width", `${options.width}`);
  if (options.height) args.push("--height", `${options.height}`);
  if (options.fps) args.push("--fps", `${options.fps}`);
  if (options.duration) args.push("--duration", `${options.duration}`);
  if (options.outFile) args.push("--out-file", options.outFile);
  if (options.withAudio) args.push("--with-audio");
  if (options.useInnerProxy) args.push("--use-inner-proxy");
  if (options.deterministic) args.push("--deterministic");

  const w = options.width ?? DEFAULT_WIDTH;
  const h = options.height ?? DEFAULT_HEIGHT;
  const handle = await runElectronApp({ width: w, height: h }, args);
  handle.process.stdout?.on("data", (data: Buffer) => {
    let message = data.toString().trim();
    const start = message.indexOf(PROGRESS_TAG);
    if (start < 0) return;
    message = message.slice(start + PROGRESS_TAG.length);
    const end = message.indexOf("%");
    if (end < 0) return;
    const progress = parseNumber(message.slice(0, end));
    void options.onProgress?.(Math.floor(progress * RECORD_WEIGHT));
  });
  return handle;
}

export async function pup(source: string, options: PupOptions): Promise<PupResult> {
  logger.debug(TAG, `pup`, source, options);

  const { signal } = options;
  if (signal?.aborted) throw signal.reason;

  const outFile = options.outFile ?? DEFAULT_OUT_FILE;
  const tmpDir = join(tmpdir(), "pup", randomUUID());
  const summaryFile = join(tmpDir, "summary.json");
  const t0 = performance.now();
  const handle = await runPupApp(source, { ...options, outFile: summaryFile });

  const onAbort = () => {
    logger.debug(TAG, `aborted`);
    const pid = handle.process.pid;
    if (pid) treeKill(pid);
    else handle.process.kill();
    rmSync(tmpDir, { recursive: true, force: true });
  };
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    // S1. record to BGRA and audio files
    await handle.wait;

    // S2. encode to output file
    const encBase = RECORD_WEIGHT * 100;
    const summary = JSON.parse(await readFile(summaryFile, "utf-8")) as RenderResult;
    const result = await encodeBgra({
      summary,
      outFile,
      signal,
      onProgress: (p) => {
        void options.onProgress?.(encBase + Math.floor(p * (1 - RECORD_WEIGHT)));
      },
    });
    logger.info(TAG, `done in ${Math.round(performance.now() - t0)}ms`);
    return result;
  } catch (e) {
    if (signal?.aborted) throw signal.reason;
    throw e;
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}
