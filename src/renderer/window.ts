// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/27.

import { BrowserWindow } from "electron";
import { logger } from "../base/logging";
import { useRetry } from "../base/retry";
import { sleep } from "../base/timing";
import { buildWrapperHTML } from "./frame_sync";
import { checkHTML } from "./html_check";
import { proxiedUrl, setInterceptor, unsetInterceptor } from "./network";
import type { RenderOptions } from "./schema";

const TAG = "[Window]";

function waitForFinish(win: BrowserWindow, action: () => void) {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("load window timeout")), 30_000);
    const done = (err?: Error) => {
      clearTimeout(timeout);
      err ? reject(err) : resolve();
    };
    win.webContents.once("did-stop-loading", () => done());
    win.webContents.once("did-frame-finish-load", (_, isMainFrame, frameProcessId, frameRoutingId) => {
      logger.debug(TAG, "did-frame-finish-load:", { isMainFrame, frameProcessId, frameRoutingId });
    });
    win.webContents.once("dom-ready", () => {
      logger.debug(TAG, "dom-ready");
    });
    win.webContents.once("did-fail-load", (_e, code, desc, url) =>
      done(new Error(`failed to load ${url}: [${code}] ${desc}`)),
    );
    win.webContents.once("render-process-gone", (_e, { exitCode, reason }) =>
      done(new Error(`renderer crashed: ${exitCode}, ${reason}`)),
    );
    action();
  });
}

function waitForDestroy(win: BrowserWindow) {
  return new Promise<void>((resolve) => {
    unsetInterceptor(win);
    win.once("closed", resolve);
    win.destroy();
  });
}

async function openWindow(source: string, options: RenderOptions): Promise<BrowserWindow> {
  checkHTML(source);

  const { width, height, useInnerProxy } = options;
  const src = useInnerProxy ? proxiedUrl(source) : source;

  const win = new BrowserWindow({
    width,
    height: height + 1,
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

  win.webContents.on("console-message", ({ level, message, lineNumber, sourceId }) => {
    if (level === "error") {
      logger.error(TAG, "console:", { message, lineNumber, sourceId, source });
    }
  });

  const wrapperHTML = buildWrapperHTML(src, { width, height });
  const dataURL = `data:text/html;charset=utf-8,${encodeURIComponent(wrapperHTML)}`;
  try {
    await waitForFinish(win, () => win.loadURL(dataURL));
  } catch (e) {
    await waitForDestroy(win);
    throw e;
  }

  return win;
}

export async function loadWindow(source: string, options: RenderOptions): Promise<BrowserWindow> {
  let warmup: BrowserWindow | undefined;
  try {
    warmup = await useRetry({ fn: openWindow, maxAttempts: 2 })(source, options);
  } catch (e) {
    const { message, stack } = e as Error;
    throw new Error(`failed to load window: ${JSON.stringify({ source, message, stack })}`);
  }

  warmup.webContents.removeAllListeners();
  unsetInterceptor(warmup);

  // warmup for shaders
  await sleep(2000);
  await waitForDestroy(warmup);

  try {
    return await openWindow(source, options);
  } catch (e) {
    const { message, stack } = e as Error;
    throw new Error(`failed to load window: ${JSON.stringify({ source, message, stack })}`);
  }
}
