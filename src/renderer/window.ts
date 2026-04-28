// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/27.

import { BrowserWindow } from "electron";
import { logger } from "../base/logging";
import { useRetry } from "../base/retry";
import { sleep } from "../base/timing";
import { checkHTML } from "./html_check";
import { proxiedUrl, setInterceptor, unsetInterceptor } from "./network";
import { createStegoURL } from "./protocol";
import type { IPCRenderOptions } from "./schema";

const TAG = "[Window]";
const TIMEOUT_ERROR = new Error("window timeout");

interface FinishOptions {
  source: string;
  win: BrowserWindow;
  action: () => void;
  tolerant?: boolean;
  signal?: AbortSignal;
}

function waitForFinish({ source, win, action, tolerant, signal }: FinishOptions) {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => done(TIMEOUT_ERROR), 10_000);
    const done = (err?: unknown) => {
      clearTimeout(timeout);
      if (err) reject(err);
      else resolve();
    };
    signal?.throwIfAborted();
    signal?.addEventListener("abort", () => done(signal.reason), { once: true });
    win.webContents.once("dom-ready", () => {
      logger.debug(TAG, "dom-ready:", { source });
      if (tolerant) done();
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
    const done = () => (clearTimeout(timer), resolve());
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
  preload?: string;
  onCreated?: WindowCreatedCallback;
  signal?: AbortSignal;
}

async function openWindow({
  source,
  renderer,
  tolerant,
  preload,
  signal,
  onCreated,
}: WindowOptions): Promise<BrowserWindow> {
  checkHTML(source);

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
      nodeIntegration: true,
      nodeIntegrationInSubFrames: true,
      nodeIntegrationInWorker: true,
      contextIsolation: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
      experimentalFeatures: true,
      preload,
    },
  });
  setInterceptor({ source, window: win, useInnerProxy });
  win.webContents.debugger.attach("1.3");
  await onCreated?.(win);

  win.webContents.on("console-message", ({ level, message, lineNumber, sourceId }) => {
    const msgs = [TAG, "console:", { message, lineNumber, sourceId, source }];
    level === "error" ? logger.error(...msgs) : logger.debug(...msgs);
    if (level === "warning" && message.startsWith(`%cElectron Security Warning`)) return;
    renderer.onConsole(level, message);
  });

  try {
    const url = createStegoURL(src, { width, height });
    await waitForFinish({ source, win, action: () => win.loadURL(url), tolerant, signal });
  } catch (e) {
    await disposeWindow(win);
    throw e;
  }

  return win;
}

const openWindowWithRetry = useRetry({ fn: openWindow, maxAttempts: 2 });

export async function loadWindow({
  source,
  renderer,
  preload,
  onCreated,
  signal,
}: WindowOptions): Promise<BrowserWindow> {
  signal?.throwIfAborted();
  let warmup: BrowserWindow | undefined;
  let error: unknown;
  try {
    warmup = await openWindowWithRetry({ source, renderer, signal });
  } catch (e) {
    error = e;
  }

  const open = () => openWindow({ source, renderer, preload, onCreated, signal, tolerant: renderer.windowTolerant });

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
