// Created by Autokaka (qq1909698494@gmail.com) on 2026/03/13.

import { type BrowserWindow, type NativeImage } from "electron";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { advanceVirtualTime } from "../base/cdp";
import { isEmpty } from "../base/image";
import { logger } from "../base/logging";
import { FixedBufferWriter } from "../rust/lib";
import { decodeTimestamp, startSync, stopSync } from "./frame_sync";
import type { RenderOptions, RenderResult } from "./schema";
import { loadWindow } from "./window";

const TAG = "[Shoot]";

const tickAnims = (frameMs: number): string =>
  `document.getAnimations().forEach(function(a){a.pause();a.currentTime=${frameMs};})`;

function awaitStegoFrame(
  win: BrowserWindow,
  width: number,
  height: number,
  afterTs: number,
  frameIndex: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`frame ${frameIndex} paint timeout`)),
      1_000,
    );
    const handler = (_e: unknown, _d: unknown, image: NativeImage) => {
      if (isEmpty(image)) return;
      const bitmap = image.toBitmap();
      const ts = decodeTimestamp(bitmap, image.getSize());
      if (ts === undefined || ts <= afterTs) return;
      clearTimeout(timeout);
      win.webContents.off("paint", handler);
      resolve(Buffer.from(bitmap.subarray(0, height * width * 4)));
    };
    win.webContents.on("paint", handler);
  });
}

export async function shoot(
  source: string,
  options: RenderOptions,
): Promise<void> {
  const { outDir, fps, width, height, duration, withAudio } = options;
  if (withAudio) {
    logger.warn(TAG, "Audio capture is not supported in deterministic mode");
  }

  logger.info(TAG, `progress: 0%`);
  await mkdir(outDir, { recursive: true });

  const win = await loadWindow(source, options);
  const cdp = win.webContents.debugger;
  cdp.attach("1.3");

  win.webContents.setFrameRate(240);
  if (!win.webContents.isPainting()) {
    win.webContents.startPainting();
  }

  await startSync(cdp);

  const bgra = join(outDir, "output.bgra");
  const total = Math.ceil(fps * duration);
  const frameInterval = 1000 / fps;
  const writer = new FixedBufferWriter(bgra, width * height * 4, fps);

  let written = 0;
  let progress = 0;

  try {
    for (let frame = 0; frame < total; frame++) {
      const frameMs = (frame + 1) * frameInterval;
      const pending = awaitStegoFrame(win, width, height, frameMs - 1, frame);

      await advanceVirtualTime(cdp, frameInterval);
      const rootFrame = win.webContents.mainFrame.frames[0];
      await rootFrame?.executeJavaScript(tickAnims(frameMs));

      writer.write(await pending);
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
    await writer.close();
  }

  if (written === 0) {
    throw new Error("no frames captured");
  }

  try {
    const result: RenderResult = { options, written, bgra };
    await writeFile(join(outDir, "render.json"), JSON.stringify(result));
    logger.info(TAG, `progress: 100%, ${written} frames written`);
  } finally {
    win.close();
  }
}
