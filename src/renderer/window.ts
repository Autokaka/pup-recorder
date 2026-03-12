// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/27.

import { BrowserWindow } from "electron";
import { logger } from "../base/logging";
import { useRetry } from "../base/retry";
import { buildWrapperHTML } from "./frame_sync";
import { checkHTML } from "./html_check";
import { proxiedUrl, setInterceptor, unsetInterceptor } from "./network";
import type { RenderOptions } from "./schema";

const TAG = "[Window]";

function waitForFinish(win: BrowserWindow, action: () => void) {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("load window timeout")),
      30_000,
    );
    const done = (err?: Error) => {
      clearTimeout(timeout);
      err ? reject(err) : resolve();
    };
    win.webContents.once("did-finish-load", () => done());
    win.webContents.once("did-fail-load", (_e, code, desc, url) =>
      done(new Error(`failed to load ${url}: [${code}] ${desc}`)),
    );
    win.webContents.once("render-process-gone", (_e, { exitCode, reason }) =>
      done(new Error(`renderer crashed: ${exitCode}, ${reason}`)),
    );
    action();
  });
}

async function openWindow(
  wins: BrowserWindow[],
  source: string,
  options: RenderOptions,
): Promise<BrowserWindow> {
  checkHTML(source);

  const { width, height, useInnerProxy } = options;

  let src = source;
  if (useInnerProxy) {
    src = proxiedUrl(source);
  }

  wins.forEach((w) => {
    w.webContents.removeAllListeners();
    unsetInterceptor(w);
    logger.debug(TAG, `destroy window:`, w.id);
  });
  const win = new BrowserWindow({
    width,
    height: height + 1,
    show: false,
    transparent: true,
    backgroundColor: undefined,
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
  wins.splice(0).forEach((w) => w.destroy());
  wins.push(win);

  win.webContents.on(
    "console-message",
    ({ level, message, lineNumber, sourceId }) => {
      if (level === "error") {
        logger.error(TAG, "console:", {
          message,
          lineNumber,
          sourceId,
          source,
        });
      }
    },
  );

  const wrapperHTML = buildWrapperHTML(src, { width, height });
  const dataURL = `data:text/html;charset=utf-8,${encodeURIComponent(wrapperHTML)}`;
  await waitForFinish(win, () => win.loadURL(dataURL));

  return win;
}

export async function loadWindow(
  source: string,
  options: RenderOptions,
): Promise<BrowserWindow> {
  try {
    const wins: BrowserWindow[] = [];
    await useRetry({ fn: openWindow, maxAttempts: 2 })(wins, source, options);
    return await openWindow(wins, source, options);
  } catch (e) {
    const { message, stack } = e as Error;
    const desc = { source, message, stack };
    throw new Error(`failed to load window: ${JSON.stringify(desc)}`);
  }
}
