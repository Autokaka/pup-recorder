// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/09.

import { ok } from "assert";
import { randomUUID } from "crypto";
import { rmSync } from "fs";
import { mkdir } from "fs/promises";
import { platform, tmpdir } from "os";
import { join } from "path";
import treeKill from "tree-kill";
import { pupExperimentalPuppeteer } from "./base/constants";
import { logger } from "./base/logging";
import { runElectronApp } from "./renderer/electron";
import { createIpcServer, type IpcDonePayload } from "./renderer/ipc";
import { doPuppeteer } from "./renderer/puppeteer";
import { defaultRenderOptions, type RenderOptions, type RenderResult } from "./renderer/schema";

const TAG = "[pup]";

export type PupProgressCallback = (progress: number) => Promise<void> | void;

export interface PupOptions extends Partial<RenderOptions> {
  signal?: AbortSignal;
  onProgress?: PupProgressCallback;
}

export interface PupResult extends RenderResult {}

interface AppOptions extends RenderOptions {
  signal?: AbortSignal;
}

async function runPupApp(source: string, options: AppOptions, socketPath: string) {
  logger.debug(TAG, `runPupApp`, source, options);

  const args: string[] = [
    source,
    `--width`,
    `${options.width}`,
    `--height`,
    `${options.height}`,
    `--fps`,
    `${options.fps}`,
    `--duration`,
    `${options.duration}`,
    `--out-file`,
    `${options.outFile}`,
  ];
  if (options.withAudio) args.push(`--with-audio`);
  if (options.useInnerProxy) args.push(`--use-inner-proxy`);
  if (options.deterministic) args.push(`--deterministic`);

  return runElectronApp(options, args, socketPath);
}

const d = defaultRenderOptions;

export async function pup(source: string, options: Partial<PupOptions>): Promise<PupResult> {
  logger.debug(TAG, `pup`, source, options);

  const { signal } = options;
  if (signal?.aborted) throw signal.reason;

  const outFile = options.outFile ?? d.outFile;
  const renderOpts: RenderOptions = {
    width: options.width ?? d.width,
    height: options.height ?? d.height,
    fps: options.fps ?? d.fps,
    duration: options.duration ?? d.duration,
    withAudio: options.withAudio ?? d.withAudio,
    useInnerProxy: options.useInnerProxy ?? d.useInnerProxy,
    deterministic: options.deterministic ?? d.deterministic,
    outFile,
  };

  const tmpDir = join(tmpdir(), "pup", randomUUID());
  await mkdir(tmpDir, { recursive: true });
  const socketPath = join(tmpDir, "pup.sock");

  const t0 = performance.now();
  const tick = (p: number) => (logger.info(TAG, `${source} progress: ${p}%`), options.onProgress?.(p));

  // On Linux + deterministic mode, use Puppeteer inline (no Electron subprocess needed).
  if (platform() === "linux" && renderOpts.deterministic && pupExperimentalPuppeteer) {
    tick(0);
    const summary = await doPuppeteer(source, renderOpts, tick);
    tick(100);
    logger.info(TAG, `done ${outFile} in ${Math.round(performance.now() - t0)}ms`);
    return { ...summary, options: renderOpts };
  }

  const server = await createIpcServer(socketPath);
  const handle = await runPupApp(source, { ...renderOpts, signal }, socketPath);

  const onAbort = () => {
    logger.debug(TAG, `aborted`);
    const pid = handle.process.pid;
    if (pid) treeKill(pid);
    else handle.process.kill();
    rmSync(tmpDir, { recursive: true, force: true });
  };
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const result = new Promise<IpcDonePayload>(async (resolve, reject) => {
      (await server.waitForConnection())
        .on("close", () => reject(new Error("IPC closed without result")))
        .on("message", () => signal?.aborted && reject(signal.reason))
        .on("progress", tick)
        .on("done", resolve)
        .on("error", reject);
    }).finally(() => server.close());
    tick(0);
    const summary = await Promise.race([result, handle.wait]);
    ok(summary, "no summary received");
    tick(100);
    logger.info(TAG, `done ${outFile} in ${Math.round(performance.now() - t0)}ms`);
    return { ...summary, options: renderOpts };
  } catch (e) {
    if (signal?.aborted) throw signal.reason;
    throw e;
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}
