// Created by Autokaka (qq1909698494@gmail.com) on 2026/03/13.

import { ok } from "assert";
import { nativeImage, type BrowserWindow, type NativeImage } from "electron";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { advanceVirtualTime } from "../base/cdp";
import { EncoderPipeline } from "../base/encoder/encoder";
import { isEmpty } from "../base/image";
import { logger } from "../base/logging";
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
  width: number,
  height: number,
  afterTs: number,
  frameIndex: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`frame ${frameIndex} paint timeout`)), 1_000);
    const handler = (_e: unknown, _d: unknown, image: NativeImage) => {
      if (isEmpty(image)) return;
      const bitmap = image.toBitmap();
      const ts = decodeTimestamp(bitmap, image.getSize());
      if (ts === undefined || ts <= afterTs) return;
      clearTimeout(timeout);
      win.webContents.off("paint", handler);
      resolve(Buffer.from(bitmap.buffer, bitmap.byteOffset, height * width * 4));
    };
    win.webContents.on("paint", handler);
  });
}

export async function shoot(source: string, options: RenderOptions): Promise<void> {
  const { outDir, fps, width, height, duration, withAudio, formats } = options;
  if (withAudio) {
    logger.warn(TAG, "Audio capture is not supported in deterministic mode");
  }

  logger.info(TAG, `progress: 0%`);
  await mkdir(outDir, { recursive: true });

  const win = await loadWindow(source, options);
  try {
    const cdp = win.webContents.debugger;
    cdp.attach("1.3");

    win.webContents.setFrameRate(240);
    const rootFrame = win.webContents.mainFrame.frames[0];
    await rootFrame?.executeJavaScript(tickAnims(0));

    if (!win.webContents.isPainting()) {
      win.webContents.startPainting();
    }

    await startSync(cdp);

    const pipeline = await EncoderPipeline.create({ width, height, fps, formats, outDir, withAudio });
    const total = Math.ceil(fps * duration);
    const frameInterval = 1000 / fps;
    const frameIntervalUs = Math.round(1_000_000 / fps);

    let written = 0;
    let progress = 0;
    let coverBgra: Buffer | undefined;

    try {
      for (let frame = 0; frame < total; frame++) {
        const frameMs = (frame + 1) * frameInterval;
        const pending = awaitStegoFrame(win, width, height, frameMs - 1, frame);

        await advanceVirtualTime(cdp, frameInterval);
        await rootFrame?.executeJavaScript(tickAnims(frameInterval));

        const bitmap = await pending;

        if (frame === 0) {
          coverBgra = bitmap;
        }

        await pipeline.encodeFrame(bitmap, frame * frameIntervalUs);
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
    }

    if (written === 0) {
      throw new Error("no frames captured");
    }

    const outputFiles = await pipeline.finish();
    const coverPath = join(outDir, "cover.png");
    ok(coverBgra, "cover image is missing");
    const png = nativeImage.createFromBuffer(coverBgra, { width, height }).toPNG();
    await writeFile(coverPath, png);
    const result: RenderResult = {
      options,
      written,
      files: { ...outputFiles, cover: coverPath },
    };
    await writeFile(join(outDir, "summary.json"), JSON.stringify(result));
    logger.info(TAG, `progress: 100%, ${written} frames written`);
  } finally {
    win.close();
  }
}
