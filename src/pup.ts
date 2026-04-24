// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/09.

import { logger } from "./base/logging";
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

async function runPupApp(source: string, render: RenderOptions) {
  logger.debug(TAG, `runPupApp`, source, render);

  const args: string[] = [
    source,
    `--width`,
    `${render.width}`,
    `--height`,
    `${render.height}`,
    `--fps`,
    `${render.fps}`,
    `--duration`,
    `${render.duration}`,
    `--out-file`,
    `${render.outFile}`,
  ];
  if (render.withAudio) args.push(`--with-audio`);
  if (render.useInnerProxy) args.push(`--use-inner-proxy`);
  if (render.deterministic) args.push(`--deterministic`);
  if (render.disableGpu) args.push(`--disable-gpu`);
  if (render.disableHwCodec) args.push(`--disable-hw-codec`);
  if (render.windowTolerant) args.push(`--window-tolerant`);

  return runElectronApp({ args });
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

  const handle = await runPupApp(source, renderOpts);

  const onAbort = () => (logger.error(TAG, `aborted`), handle.kill());
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const result = new Promise<IpcDonePayload>((resolve, reject) => {
      new IpcReader(handle.process)
        .on("close", (code) => {
          const msg = JSON.stringify({ source, progress, code, killed: handle.killed });
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
  }
}
