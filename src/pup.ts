// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/09.

import { logger } from "./base/logging";
import { runElectronApp } from "./renderer/electron";
import { type IpcDonePayload, IpcMsgType, IpcReader } from "./renderer/ipc";
import {
  type ConsoleCallback,
  defaultRenderOptions,
  type ProgressCallback,
  type RenderOptions,
  type RenderResult,
} from "./renderer/schema";

const TAG = "[pup]";

export interface PupOptions extends Partial<RenderOptions> {
  signal?: AbortSignal;
  onProgress?: ProgressCallback;
  onConsole?: ConsoleCallback;
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
    `--window-timeout`,
    `${render.windowTimeout}`,
    `--out-file`,
    render.outFiles.join(","),
  ];
  if (render.withAudio) {
    args.push(`--with-audio`);
  }
  if (render.useInnerProxy) {
    args.push(`--use-inner-proxy`);
  }
  if (render.deterministic) {
    args.push(`--deterministic`);
  }
  if (render.disableGpu) {
    args.push(`--disable-gpu`);
  }
  if (render.disableHwCodec) {
    args.push(`--disable-hw-codec`);
  }
  if (render.windowTolerant) {
    args.push(`--window-tolerant`);
  }
  if (render.screenshots.length > 0) {
    args.push(`--screenshots`, render.screenshots.join(","));
  }

  return runElectronApp({ args });
}

const d = defaultRenderOptions;

export async function pup(source: string, options: Partial<PupOptions>): Promise<PupResult> {
  logger.debug(TAG, `pup`, source, options);

  const { signal } = options;
  signal?.throwIfAborted();

  const outFiles = options.outFiles ?? d.outFiles;
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
    windowTimeout: options.windowTimeout ?? d.windowTimeout,
    screenshots: options.screenshots ?? d.screenshots,
    outFiles,
  };

  const t0 = performance.now();
  let progress = 0;
  const tick = (p: number) => {
    progress = p;
    options.onProgress?.(p);
  };

  const handle = await runPupApp(source, renderOpts);

  let killTimer: NodeJS.Timeout | undefined;
  const onAbort = () => {
    handle.process.send?.({ type: IpcMsgType.Cancel, reason: String(signal?.reason ?? "abort") });
    killTimer = setTimeout(() => handle.kill(), 5_000);
  };
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const result = new Promise<IpcDonePayload>((resolve, reject) => {
      new IpcReader(handle.process)
        .on("close", (code) => {
          const msg = JSON.stringify({ source, progress, code, killed: handle.killed });
          reject(new Error(`crashed: ${msg}`));
        })
        .on("progress", tick)
        .on("console", (l, m) => options.onConsole?.(l, m))
        .on("done", resolve)
        .on("error", reject);
    });
    tick(0);
    const [summary] = await Promise.all([result, handle.wait]);
    tick(100);
    logger.debug(TAG, `done ${outFiles.join(",")} in ${Math.round(performance.now() - t0)}ms`);
    return { ...summary, options: renderOpts };
  } catch (e) {
    handle.kill();
    signal?.throwIfAborted();
    throw e;
  } finally {
    clearTimeout(killTimer);
    signal?.removeEventListener("abort", onAbort);
  }
}
