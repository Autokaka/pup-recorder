// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/27.

import { BrowserWindow } from "electron";
import { logger } from "../base/logging";
import { useRetry } from "../base/retry";
import { sleep } from "../base/timing";
import { checkHTML } from "./html_check";
import { proxiedUrl, setInterceptor, unsetInterceptor } from "./network";
import { createStegoURL } from "./protocol";
import type { RenderOptions } from "./schema";

const TAG = "[Window]";
const TIMEOUT_ERROR = new Error("window timeout");

interface FinishOptions {
  source: string;
  win: BrowserWindow;
  action: () => void;
  tolerant?: boolean;
}

function waitForFinish({ source, win, action, tolerant }: FinishOptions) {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => done(TIMEOUT_ERROR), 10_000);
    const done = (err?: unknown) => {
      clearTimeout(timeout);
      if (err) reject(err);
      else resolve();
    };
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
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    win.once("closed", done);
    win.close();
    setTimeout(() => {
      if (settled) return;
      try {
        logger.warn(TAG, "force close");
        win.destroy();
      } catch {}
      done();
    }, 1000);
  });
}

export interface WindowOptions {
  source: string;
  onCreated?: (window: BrowserWindow) => Promise<void>;
  renderer: RenderOptions;
  warmup?: boolean;
  tolerant?: boolean;
}

async function openWindow({ source, onCreated, renderer, warmup, tolerant }: WindowOptions): Promise<BrowserWindow> {
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
    },
  });
  setInterceptor({ source, window: win, useInnerProxy });
  if (!warmup) {
    await onCreated?.(win);
  }

  win.webContents.on("console-message", ({ level, message, lineNumber, sourceId }) => {
    const msgs = [TAG, "console:", { message, lineNumber, sourceId, source }];
    level === "error" ? logger.error(...msgs) : logger.debug(...msgs);
  });

  try {
    const url = createStegoURL(src, { width, height });
    await waitForFinish({ source, win, action: () => win.loadURL(url), tolerant });
  } catch (e) {
    await disposeWindow(win);
    throw e;
  }

  return win;
}

const openWindowWithRetry = useRetry({ fn: openWindow, maxAttempts: 2 });

export async function loadWindow({ source, onCreated, renderer }: WindowOptions): Promise<BrowserWindow> {
  let warmup: BrowserWindow | undefined;
  let error: unknown;
  try {
    warmup = await openWindowWithRetry({ source, renderer, warmup: true });
  } catch (e) {
    error = e;
  }

  const open = () => {
    return openWindow({
      source,
      renderer,
      onCreated,
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
