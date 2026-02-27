// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/27.

import { BrowserWindow, session } from "electron";
import { buildWrapperHTML } from "./frame_sync";
import { checkHTML } from "./html_check";
import { logger } from "./logging";
import { enableProxy, proxiedUrl } from "./proxy";
import { useRetry } from "./retry";
import type { RecordOptions } from "./schema";

const TAG = "[Window]";

function waitForFinish(win: BrowserWindow, action: () => void) {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("load window timeout")),
      20_000,
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
  options: RecordOptions,
): Promise<BrowserWindow> {
  checkHTML(source);

  const { width, height, useInnerProxy } = options;

  session.defaultSession.webRequest.onHeadersReceived(
    ({ responseHeaders }, callback) => {
      delete responseHeaders?.["x-frame-options"];
      delete responseHeaders?.["X-Frame-Options"];
      delete responseHeaders?.["content-security-policy"];
      delete responseHeaders?.["Content-Security-Policy"];
      callback({ cancel: false, responseHeaders });
    },
  );

  let src = source;
  if (useInnerProxy) {
    src = proxiedUrl(source);
    enableProxy();
  }

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
      contextIsolation: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
      experimentalFeatures: true,
    },
  });
  wins.splice(0).forEach((w) => w.destroy());
  wins.push(win);

  win.webContents.on("console-message", ({ level, message }) => {
    if (level === "error") logger.error(TAG, "console:", message);
  });

  const wrapperHTML = buildWrapperHTML(src, { width, height });
  const dataURL = `data:text/html;charset=utf-8,${encodeURIComponent(wrapperHTML)}`;
  await waitForFinish(win, () => win.loadURL(dataURL));

  return win;
}

export async function loadWindow(
  source: string,
  options: RecordOptions,
): Promise<BrowserWindow> {
  const wins: BrowserWindow[] = [];
  const win = await useRetry({ fn: openWindow, maxAttempts: 2 })(
    wins,
    source,
    options,
  );
  await waitForFinish(win, () => win.reload());
  return win;
}
