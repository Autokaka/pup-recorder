// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/09.

import { spawn } from "child_process";
import type { Size } from "electron";
import { readFile, rm } from "fs/promises";
import { join } from "path";
import { AbortLink, type AbortQuery } from "./base/abort";
import { pupAppPath } from "./base/constants";
import { runElectronApp } from "./base/electron";
import { encodeBgraFile, encodeBgraToMov } from "./base/encoder";
import { createCoverCommand } from "./base/ffmpeg";
import { ConcurrencyLimiter } from "./base/limiter";
import { logger } from "./base/logging";
import { parseNumber } from "./base/parser";
import { type ProcessHandle } from "./base/process";
import type { RecordResult } from "./base/record";
import { waitAll } from "./base/stream";
import type { VideoFilesWithCover, VideoSpec } from "./base/types";
import { DEFAULT_HEIGHT, DEFAULT_WIDTH } from "./common";

const TAG = "[pup]";

export type PupProgressCallback = (progress: number) => Promise<void> | void;

export interface PupOptions {
  withAlphaChannel?: boolean;
  width?: number;
  height?: number;
  fps?: number;
  duration?: number;
  outDir?: string;
  cancelQuery?: AbortQuery;
  onProgress?: PupProgressCallback;
}

const PROGRESS_TAG = " progress: ";

function runPupApp(source: string, options: PupOptions) {
  logger.debug(TAG, `runPupApp`, source, options);

  const args: string[] = [source];
  if (options.width) args.push("--width", `${options.width}`);
  if (options.height) args.push("--height", `${options.height}`);
  if (options.fps) args.push("--fps", `${options.fps}`);
  if (options.duration) args.push("--duration", `${options.duration}`);
  if (options.outDir) args.push("--out-dir", options.outDir);
  if (options.withAlphaChannel) args.push("--with-alpha-channel");

  const w = options.width ?? DEFAULT_WIDTH;
  const h = options.height ?? DEFAULT_HEIGHT;
  const handle = runElectronApp({ width: w, height: h }, pupAppPath, args);
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

export async function pup(source: string, options: PupOptions) {
  logger.debug(TAG, `pup`, source, options);

  const link = AbortLink.start(options.cancelQuery);
  const outDir = options.outDir ?? "out";

  const t0 = performance.now();
  const { handle, counter } = runPupApp(source, { ...options, outDir });

  await link.wait(handle);
  await counter.end();
  logger.info(TAG, `capture cost ${Math.round(performance.now() - t0)}ms`);

  const metaPath = join(outDir, "record.json");
  const meta = JSON.parse(await readFile(metaPath, "utf-8")) as RecordResult;

  const { bgraPath, written, options: recordOptions } = meta;
  const { fps, width, height, withAlphaChannel } = recordOptions;
  const size: Size = { width, height };

  const outputs: VideoFilesWithCover = {
    mp4: withAlphaChannel ? undefined : join(outDir, "output.mp4"),
    webm: withAlphaChannel ? join(outDir, "output.webm") : undefined,
    mov: withAlphaChannel ? join(outDir, "output.mov") : undefined,
    cover: join(outDir, "cover.png"),
  };

  try {
    const t1 = performance.now();

    const spec: VideoSpec = { fps, frames: written, size };
    const handles: ProcessHandle[] = [];
    if (outputs.mp4) {
      handles.push(encodeBgraFile(bgraPath, outputs.mp4, spec, "mp4"));
    }
    if (outputs.webm) {
      handles.push(encodeBgraFile(bgraPath, outputs.webm, spec, "webm"));
    }
    if (outputs.mov) {
      handles.push(encodeBgraToMov(bgraPath, outputs.mov, spec));
    }
    await link.wait(...handles);

    const coverSrc = outputs.mov ?? outputs.webm ?? outputs.mp4;
    if (coverSrc) {
      const coverCmd = createCoverCommand(coverSrc, outputs.cover);
      await waitAll(
        spawn(coverCmd.command, coverCmd.args, { stdio: "inherit" }),
      );
    }

    link.stop();
    logger.info(TAG, `encoding cost ${Math.round(performance.now() - t1)}ms`);

    await Promise.all([
      rm(bgraPath, { force: true }),
      rm(metaPath, { force: true }),
    ]);
    return {
      ...outputs,
      width,
      height,
      fps,
      duration: Math.ceil(written / fps),
    };
  } catch (error) {
    await rm(outDir, { recursive: true, force: true });
    throw error;
  }
}
