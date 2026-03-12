// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/09.

import type { Size } from "electron";
import { readFile, rm } from "fs/promises";
import { join } from "path";
import { AbortLink, type AbortQuery } from "./base/abort";
import { pupNoCleanup } from "./base/constants";
import { encodeBGRAFile, encodeBgraToMov } from "./base/encoder";
import { createCoverCommand } from "./base/ffmpeg";
import { ConcurrencyLimiter } from "./base/limiter";
import { logger } from "./base/logging";
import { parseNumber } from "./base/parser";
import { exec, type ProcessHandle } from "./base/process";
import { runElectronApp } from "./renderer/electron";
import {
  DEFAULT_HEIGHT,
  DEFAULT_WIDTH,
  type RenderOptions,
  type RenderResult,
  type VideoFilesWithCover,
  type VideoSpec,
} from "./renderer/schema";

const TAG = "[pup]";
const PROGRESS_TAG = " progress: ";

export type PupProgressCallback = (progress: number) => Promise<void> | void;

export interface PupOptions extends Partial<RenderOptions> {
  cancelQuery?: AbortQuery;
  onProgress?: PupProgressCallback;
}

export interface PupResult {
  options: RenderOptions;
  files: VideoFilesWithCover;
}

async function runPupApp(source: string, options: PupOptions) {
  logger.debug(TAG, `runPupApp`, source, options);

  const args: string[] = [source];
  if (options.width) args.push("--width", `${options.width}`);
  if (options.height) args.push("--height", `${options.height}`);
  if (options.fps) args.push("--fps", `${options.fps}`);
  if (options.duration) args.push("--duration", `${options.duration}`);
  if (options.outDir) args.push("--out-dir", options.outDir);
  if (options.withAlphaChannel) args.push("--with-alpha-channel");
  if (options.withAudio) args.push("--with-audio");
  if (options.useInnerProxy) args.push("--use-inner-proxy");

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

export async function pup(
  source: string,
  options: PupOptions,
): Promise<PupResult> {
  logger.debug(TAG, `pup`, source, options);

  const link = AbortLink.start(options.cancelQuery);
  const outDir = options.outDir ?? "out";

  const t0 = performance.now();
  const { handle, counter } = await runPupApp(source, { ...options, outDir });

  await link.wait(handle);
  await counter.end();
  logger.info(TAG, `capture cost ${Math.round(performance.now() - t0)}ms`);

  const metaPath = join(outDir, "render.json");
  const meta = JSON.parse(await readFile(metaPath, "utf-8")) as RenderResult;

  const { bgra, written, options: rec, audio } = meta;
  const { fps, width, height, withAlphaChannel } = rec;
  const pcm = audio?.pcmPath;
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
      handles.push(encodeBGRAFile({ bgra, outFile: outputs.mp4, spec, audio }));
    }
    if (outputs.webm) {
      handles.push(
        encodeBGRAFile({ bgra, outFile: outputs.webm, spec, audio }),
      );
    }
    if (outputs.mov) {
      handles.push(
        encodeBgraToMov({ bgra, outFile: outputs.mov, spec, audio }),
      );
    }
    await link.wait(...handles);

    const coverSrc = outputs.mov ?? outputs.webm ?? outputs.mp4;
    if (coverSrc) {
      const coverCmd = createCoverCommand(coverSrc, outputs.cover);
      const handle = exec(`${coverCmd.command} ${coverCmd.args.join(" ")}`);
      await link.wait(handle);
    }

    link.stop();
    logger.info(TAG, `encoding cost ${Math.round(performance.now() - t1)}ms`);

    if (!pupNoCleanup) {
      await Promise.all([
        rm(bgra, { force: true }),
        rm(metaPath, { force: true }),
        pcm && rm(pcm, { force: true }),
      ]);
    }
    return { options: meta.options, files: outputs };
  } catch (error) {
    if (!pupNoCleanup) {
      await rm(outDir, { recursive: true, force: true });
    }
    throw error;
  }
}
