// Created by Autokaka (qq1909698494@gmail.com) on 2026/03/13.

import { type BrowserWindow, type NativeImage } from "electron";
import { mkdir, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { advanceVirtualTime } from "../base/cdp";
import { isEmpty } from "../base/image";
import { logger } from "../base/logging";
import { FixedBufferWriter } from "../rust/lib";
import { decodeTimestamp, startSync, stopSync } from "./frame_sync";
import type { RenderOptions, RenderResult } from "./schema";
import { loadWindow } from "./window";

const TAG = "[Shoot]";

function tickAnims(tick: number) {
  return `document.getAnimations().forEach((a) => {
    a.pause();
    a.currentTime += ${tick};
  })`;
}

function awaitStegoFrame(
  win: BrowserWindow,
  fps: number,
  width: number,
  height: number,
  afterTs: number,
): Promise<Buffer> {
  return new Promise((resolve) => {
    const handler = (_e: unknown, _d: unknown, image: NativeImage) => {
      if (isEmpty(image)) return;
      const bitmap = image.toBitmap();
      const ts = decodeTimestamp(bitmap, image.getSize());
      if (ts === undefined || ts <= afterTs) return;
      win.webContents.stopPainting();
      win.webContents.setFrameRate(fps);
      win.webContents.off("paint", handler);
      resolve(Buffer.from(bitmap.buffer, bitmap.byteOffset, height * width * 4));
    };
    win.webContents.on("paint", handler);
  });
}

export async function shoot(source: string, options: RenderOptions): Promise<void> {
  const { outFile, fps, width, height, duration } = options;
  const outDir = dirname(outFile);
  const bgraFile = join(outDir, "output.bgra");

  logger.info(TAG, `progress: 0%`);
  await mkdir(outDir, { recursive: true });

  const frameSize = width * height * 4;
  const writer = new FixedBufferWriter(bgraFile, frameSize);
  const total = Math.ceil(fps * duration);
  const frameInterval = 1000 / fps;

  let written = 0;
  let progress = 0;

  const win = await loadWindow(source, options);
  const cdp = win.webContents.debugger;
  try {
    cdp.attach("1.3");

    win.webContents.stopPainting();
    win.webContents.setFrameRate(fps);

    const rootFrame = win.webContents.mainFrame.frames[0];
    await rootFrame?.executeJavaScript(tickAnims(0));
    await startSync(cdp);

    for (let frame = 0; frame < total; frame++) {
      const frameMs = (frame + 1) * frameInterval;
      const pending = awaitStegoFrame(win, fps, width, height, frameMs - 1);

      await Promise.all([
        advanceVirtualTime(cdp, frameInterval),
        rootFrame?.executeJavaScript(tickAnims(frameInterval)),
      ]);

      win.webContents.setFrameRate(240);
      win.webContents.startPainting();
      const bitmap = await pending;
      writer.write(bitmap);
      written++;

      const newProgress = Math.floor((written / total) * 100);
      if (Math.abs(newProgress - progress) > 10) {
        progress = newProgress;
        logger.info(TAG, `progress: ${Math.round(progress)}%`);
      }
    }
  } finally {
    await stopSync(cdp);
    cdp.detach();
    win.close();
  }

  await writer.close();

  if (written === 0) throw new Error("no frames captured");

  const result: RenderResult = { options, written, jank: 0, outFile: bgraFile };
  await writeFile(outFile, JSON.stringify(result));
  logger.info(TAG, `progress: 100%, written: ${written}`);
}
