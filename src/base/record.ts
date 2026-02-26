// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/09.

import { BrowserWindow, session, type NativeImage } from "electron";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { FixedBufferWriter } from "../rust/lib";
import {
  buildWrapperHTML,
  decodeTimestamp,
  startSync,
  stopSync,
} from "./frame_sync";
import { checkHTML } from "./html_check";
import { isEmpty } from "./image";
import { logger } from "./logging";
import { enableProxy, proxiedUrl } from "./proxy";
import { useRetry } from "./retry";
import type { RecordOptions, RecordResult } from "./schema";

const TAG = "[Record]";

async function loadWindow(source: string, options: RecordOptions) {
  checkHTML(source);

  const { width, height, useInnerProxy } = options;

  // Remove X-Frame-Options and CSP headers to allow iframe loading
  // Note: Electron's onHeadersReceived uses REPLACE behavior (not append).
  // Only the last attached listener is used, so no cleanup needed.
  // Ref: https://www.electronjs.org/docs/latest/api/web-request
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    delete responseHeaders["x-frame-options"];
    delete responseHeaders["X-Frame-Options"];
    delete responseHeaders["content-security-policy"];
    delete responseHeaders["Content-Security-Policy"];
    callback({ cancel: false, responseHeaders });
  });

  let src = source;
  if (useInnerProxy) {
    src = proxiedUrl(source);
    enableProxy();
  }

  const win = new BrowserWindow({
    width: width,
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

  win.webContents.on("console-message", (event) => {
    if (event.level === "error") {
      logger.error(TAG, "console:", event.message);
    }
  });

  const wrapperHTML = buildWrapperHTML(src, { width, height });
  const dataURL = `data:text/html;charset=utf-8,${encodeURIComponent(wrapperHTML)}`;
  let token: NodeJS.Timeout | undefined;

  await new Promise<void>((resolve, reject) => {
    token = setTimeout(() => {
      reject(new Error("load window timeout"));
    }, 20 * 1000);

    win.webContents.once("did-finish-load", resolve);

    win.webContents.once("did-fail-load", (_event, code, desc, url) => {
      reject(new Error(`failed to load ${url}: [${code}] ${desc}`));
    });

    win.webContents.once("render-process-gone", (_event, details) => {
      const { exitCode, reason } = details;
      reject(new Error(`renderer crashed: ${exitCode}, ${reason}`));
    });

    win.loadURL(dataURL);
  });
  clearTimeout(token);
  return win;
}

export async function record(
  source: string,
  options: RecordOptions,
): Promise<void> {
  logger.info(TAG, `progress: 0%`);
  const { outDir, fps, width, height, duration } = options;

  const win = await useRetry({ fn: loadWindow, maxAttempts: 2 })(
    source,
    options,
  );

  await mkdir(outDir, { recursive: true });

  const cdp = win.webContents.debugger;
  cdp.attach("1.3");

  win.webContents.setFrameRate(fps);
  if (!win.webContents.isPainting()) {
    win.webContents.startPainting();
  }

  const bgraPath = join(outDir, "output.bgra");
  const total = Math.ceil(fps * duration);
  const frameInterval = 1000 / fps;
  const bufferSize = width * height * 4;

  const writer = new FixedBufferWriter(bgraPath, bufferSize, fps);

  let written = 0;
  let lastWrittenTime: number | undefined;
  let progress = 0;
  let frameError: Error | undefined;
  let resolver: (() => void) | undefined;
  let rejecter: ((reason?: unknown) => void) | undefined;

  const scheduleWrite = (buffer: Buffer) => {
    written++;
    try {
      writer.write(buffer);
    } catch (error) {
      frameError ??= error as Error;
    }
  };

  const paint = (_e: unknown, _r: unknown, image: NativeImage) => {
    if (frameError) {
      rejecter?.(frameError);
      return;
    }

    if (written >= total) {
      resolver?.();
      return;
    }

    if (isEmpty(image)) return;

    const bitmap = image.toBitmap();
    const currentTime = decodeTimestamp(bitmap, image.getSize());
    if (currentTime === undefined) {
      frameError ??= new Error(`no timestamp @ ${written}`);
      return;
    }

    const bytesPerRow = width * 4;
    const cropped = bitmap.subarray(0, height * bytesPerRow);

    if (lastWrittenTime === undefined) {
      scheduleWrite(cropped);
      lastWrittenTime = currentTime;
      return;
    }

    const timeSinceLastFrame = currentTime - lastWrittenTime;
    if (timeSinceLastFrame < frameInterval * 0.8) {
      return;
    }

    if (timeSinceLastFrame <= frameInterval * 1.2) {
      scheduleWrite(cropped);
    } else {
      const framesToInsert = Math.round(timeSinceLastFrame / frameInterval);
      for (let i = 0; i < framesToInsert && written < total; i++) {
        scheduleWrite(cropped);
      }
    }
    lastWrittenTime = currentTime;

    const newProgress = Math.floor((written / total) * 100);
    if (Math.abs(newProgress - progress) > 10) {
      progress = newProgress;
      logger.info(TAG, `progress: ${Math.round(progress)}%`);
    }
  };

  win.webContents.on("paint", paint);
  await startSync(cdp);
  try {
    await new Promise<void>((r, j) => ([resolver, rejecter] = [r, j]));
  } finally {
    await stopSync(cdp);
    win.webContents.off("paint", paint);
    await writer.close();
  }

  if (frameError || written === 0) {
    throw frameError ?? new Error("no frames captured");
  }

  try {
    const result: RecordResult = { options, written, bgraPath };
    await writeFile(join(outDir, "record.json"), JSON.stringify(result));
    logger.info(TAG, `progress: 100%, ${written} frames written`);
  } finally {
    win.close();
  }
}
