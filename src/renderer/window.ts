// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/27.

import { join } from "node:path";
import { BrowserWindow } from "electron";
import { pupPkgRoot, pupPreload } from "../base/constants";
import { logger } from "../base/logging";
import { useRetry } from "../base/retry";
import { sleep } from "../base/timing";
import { AUDIO_ARG, WORLD_ARG, type WorldMode } from "../runtime/world";
import { proxiedUrl, setInterceptor, unsetInterceptor } from "./network";
import { createStegoURL } from "./protocol";
import type { IPCRenderOptions } from "./schema";

const TAG = "[Window]";
const TIMEOUT_ERROR = new Error("window timeout");
const CONSOLE_IGNORES = ["Mixed Content: The page at"];

interface FinishOptions {
  source: string;
  win: BrowserWindow;
  action: () => void;
  timeoutMs: number;
  tolerant?: boolean;
  signal?: AbortSignal;
}

function waitForFinish({ source, win, action, timeoutMs, tolerant, signal }: FinishOptions) {
  return new Promise<void>((resolve, reject) => {
    let domReady = false;
    // Tolerant proceeds on a partial DOM only as a timeout fallback — starting on bare dom-ready leaves the load pending and wedges virtual time.
    const timeout = setTimeout(() => done(tolerant && domReady ? undefined : TIMEOUT_ERROR), timeoutMs);
    const done = (err?: unknown) => {
      clearTimeout(timeout);
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    };
    signal?.throwIfAborted();
    signal?.addEventListener("abort", () => done(signal.reason), {
      once: true,
    });
    win.webContents.once("dom-ready", () => {
      logger.debug(TAG, "dom-ready:", { source });
      domReady = true;
    });
    win.webContents.once("did-stop-loading", () => {
      logger.debug(TAG, "did-stop-loading:", { source });
      done();
    });
    win.webContents.once("did-fail-load", (_e, code, desc, url) => {
      const msg = `did-fail-load: ${JSON.stringify({ url, source, code, desc })}`;
      logger.error(TAG, msg);
      done(new Error(msg));
    });
    win.webContents.once("preload-error", (_e, _path, error) => {
      logger.error(TAG, `preload-error: ${JSON.stringify({ source, message: error.message })}`);
      done(error);
    });
    win.webContents.once("render-process-gone", (_e, { exitCode, reason }) => {
      const msg = `render-process-gone: ${JSON.stringify({ source, exitCode, reason })}`;
      logger.error(TAG, msg);
      done(new Error(msg));
    });
    action();
  });
}

export function disposeWindow(win: BrowserWindow) {
  return new Promise<void>((resolve) => {
    unsetInterceptor(win);
    const timer = setTimeout(() => {
      try {
        logger.warn(TAG, "force close");
        win.destroy();
      } catch {}
      done();
    }, 1000);
    const done = () => {
      clearTimeout(timer);
      resolve();
    };
    win.webContents.stopPainting();
    win.webContents.debugger.detach();
    win.once("closed", done);
    win.close();
  });
}

export type WindowCreatedCallback = (window: BrowserWindow) => void | Promise<void>;

export interface WindowOptions {
  source: string;
  renderer: IPCRenderOptions;
  tolerant?: boolean;
  onCreated?: WindowCreatedCallback;
  signal?: AbortSignal;
}

// Page-world hook bundles; the preload evaluates the named one in the main world of every frame it lands in.
const WORLD_SCRIPTS: Record<WorldMode, string> = {
  shoot: join(pupPkgRoot, "dist", "runtime", "shoot.global.js"),
  render: join(pupPkgRoot, "dist", "runtime", "render.global.js"),
  audio: join(pupPkgRoot, "dist", "runtime", "audio.global.js"),
};

function pickWorldScript(renderer: IPCRenderOptions): string {
  const mode: WorldMode = renderer.deterministic ? "shoot" : renderer.withAudio ? "audio" : "render";
  return WORLD_SCRIPTS[mode];
}

async function openWindow({ source, renderer, tolerant, signal, onCreated }: WindowOptions): Promise<BrowserWindow> {
  const { width, height, useInnerProxy } = renderer;
  const src = useInnerProxy ? proxiedUrl(source) : source;

  const win = new BrowserWindow({
    width,
    height: height + 1,
    minWidth: width,
    minHeight: height + 1,
    maxWidth: width,
    maxHeight: height + 1,
    resizable: false,
    minimizable: false,
    movable: false,
    show: false,
    transparent: true,
    backgroundColor: undefined,
    frame: false,
    webPreferences: {
      offscreen: true,
      backgroundThrottling: false,
      // Carries the bridge preload into the target iframe; node stays off, as nodeIntegration keeps its false default.
      nodeIntegrationInSubFrames: true,
      // Electron sandboxes preloads by default, which breaks their bundled requires; the OS sandbox is off regardless.
      sandbox: false,
      webSecurity: !renderer.disableWebSecurity,
      // The wrapper is a secure scheme, so it upgrades the target to https and every http subresource it owns turns mixed.
      allowRunningInsecureContent: true,
      experimentalFeatures: true,
      preload: pupPreload,
      additionalArguments: [`${WORLD_ARG}${pickWorldScript(renderer)}`, ...(renderer.withAudio ? [AUDIO_ARG] : [])],
    },
  });
  setInterceptor({
    source,
    window: win,
    useInnerProxy,
    stubMedia: renderer.deterministic,
  });
  win.webContents.debugger.attach("1.3");
  await onCreated?.(win);

  win.webContents.on("console-message", ({ level, message, lineNumber, sourceId }) => {
    // Drop headless noise: security warnings and http→https auto-upgrade notices for internal-proxy assets.
    if (level === "warning" && CONSOLE_IGNORES.find((i) => message.startsWith(i))) {
      return;
    }
    const msgs = [TAG, "console:", { message, lineNumber, sourceId, source }];
    level === "error" ? logger.error(...msgs) : logger.debug(...msgs);
    renderer.onConsole(level, message);
  });

  try {
    const url = createStegoURL(src, { width, height });
    await waitForFinish({
      source,
      win,
      action: () => win.loadURL(url),
      timeoutMs: renderer.windowTimeout * 1000,
      tolerant,
      signal,
    });
  } catch (e) {
    await disposeWindow(win);
    throw e;
  }

  return win;
}

const openWindowWithRetry = useRetry({ fn: openWindow, maxAttempts: 2 });

export async function loadWindow({ source, renderer, onCreated, signal }: WindowOptions): Promise<BrowserWindow> {
  signal?.throwIfAborted();
  let warmup: BrowserWindow | undefined;
  let error: unknown;
  try {
    warmup = await openWindowWithRetry({ source, renderer, signal });
  } catch (e) {
    error = e;
  }

  const open = () => {
    return openWindow({
      source,
      renderer,
      onCreated,
      signal,
      tolerant: renderer.windowTolerant,
    });
  };

  if (renderer.windowTolerant && error === TIMEOUT_ERROR) {
    logger.warn(TAG, `warmup timeout: ${source}, falling back to dom-ready`);
    return await open();
  }

  if (error) {
    const { message, stack } = error as Error;
    throw new Error(`failed to warmup window: ${JSON.stringify({ source, message, stack })}`);
  }

  if (warmup) {
    warmup.webContents.removeAllListeners();
    unsetInterceptor(warmup);
    await sleep(2000);
    await disposeWindow(warmup);
  }

  try {
    return await open();
  } catch (e) {
    const { message, stack } = e as Error;
    throw new Error(`failed to load window: ${JSON.stringify({ source, message, stack })}`);
  }
}
