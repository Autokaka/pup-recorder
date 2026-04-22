// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/09.

import { platform } from "os";
import { logger } from "./base/logging";
import { startXvfb } from "./base/xvfb";
import { runElectronApp } from "./renderer/electron";
import { IpcReader, type IpcDonePayload } from "./renderer/ipc";
import { defaultRenderOptions, type RenderOptions, type RenderResult } from "./renderer/schema";

const TAG = "[pup]";

export type PupProgressCallback = (progress: number) => Promise<void> | void;

export interface PupOptions extends Partial<RenderOptions> {
  signal?: AbortSignal;
  onProgress?: PupProgressCallback;
}

export interface PupResult extends RenderResult {}

interface AppOptions extends RenderOptions {
  display?: number;
}

async function runPupApp(source: string, options: AppOptions) {
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
  if (options.disableGpu) args.push(`--disable-gpu`);
  if (options.disableHwCodec) args.push(`--disable-hw-codec`);
  if (options.windowTolerant) args.push(`--window-tolerant`);

  return runElectronApp({ args, display: options.display });
}

const d = defaultRenderOptions;

export async function pup(source: string, options: Partial<PupOptions>): Promise<PupResult> {
  logger.debug(TAG, `pup`, source, options);

  const { signal } = options;
  signal?.throwIfAborted();

  const outFile = options.outFile ?? d.outFile;
  const renderOpts: RenderOptions = {
    width: options.width ?? d.width,
    height: options.height ?? d.height,
    fps: options.fps ?? d.fps,
    duration: options.duration ?? d.duration,
    withAudio: options.withAudio ?? d.withAudio,
    useInnerProxy: options.useInnerProxy ?? d.useInnerProxy,
    deterministic: options.deterministic ?? d.deterministic,
    disableGpu: options.disableGpu ?? d.disableGpu,
    disableHwCodec: options.disableHwCodec ?? d.disableHwCodec,
    windowTolerant: options.windowTolerant ?? d.windowTolerant,
    outFile,
  };

  const t0 = performance.now();

  let progress = 0;
  const tick = (p: number) => {
    logger.info(TAG, `${source} progress: ${p}%`);
    progress = p;
    options.onProgress?.(p);
  };

  const xvfb = platform() === "linux" ? startXvfb(renderOpts.width, renderOpts.height + 1) : undefined;
  const handle = await runPupApp(source, { ...renderOpts, display: xvfb?.display });

  const onAbort = () => (logger.error(TAG, `aborted`), handle.kill());
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const result = new Promise<IpcDonePayload>((resolve, reject) => {
      new IpcReader(handle.process)
        .on("close", () => {
          const msg = JSON.stringify({ source, progress, killed: handle.killed });
          reject(new Error(`crashed: ${msg}`));
        })
        .on("message", () => signal?.aborted && reject(signal.reason))
        .on("progress", tick)
        .on("done", resolve)
        .on("error", reject);
    });
    tick(0);
    const [summary] = await Promise.all([result, handle.wait]);
    tick(100);
    logger.info(TAG, `done ${outFile} in ${Math.round(performance.now() - t0)}ms`);
    return { ...summary, options: renderOpts };
  } catch (e) {
    handle.kill();
    signal?.throwIfAborted();
    throw e;
  } finally {
    signal?.removeEventListener("abort", onAbort);
    xvfb?.stop();
  }
}
