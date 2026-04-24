// Created by Autokaka (qq1909698494@gmail.com) on 2026/03/13.

import {
  type BrowserWindow,
  type Event,
  type NativeImage,
  type Rectangle,
  type Size,
  type WebContentsPaintEventParams,
} from "electron";
import { advanceVirtualTime, pauseVirtualTime, resizeDrawable } from "../base/cdp";
import { EncoderPipeline } from "../base/encoder/pipeline";
import { sizeEquals } from "../base/image";
import { logger } from "../base/logging";
import { IpcWriter, type IpcDonePayload } from "./ipc";
import type { RenderOptions } from "./schema";
import { decodeStego, swapBuffer } from "./stego";
import { tick } from "./tick";
import { disposeWindow, loadWindow } from "./window";

const TAG = "[Shoot]";

interface PaintOptions {
  source: string;
  win: BrowserWindow;
  size: Size;
  ms: number;
}

async function paint({ source, win, size, ms }: PaintOptions): Promise<Buffer> {
  let lastTs: number | undefined;
  let laggy = 0;
  const cdp = win.webContents.debugger;
  const frameSize: Size = { width: size.width, height: size.height + 1 };
  const interval = setInterval(() => {
    logger.warn(TAG, `${source} render is extremely slow @ ${ms}, current: ${lastTs} with ${laggy} repeats`);
    win.webContents.invalidate();
  }, 1000);
  try {
    return await new Promise<Buffer>((resolve) => {
      const handler = (_e: Event<WebContentsPaintEventParams>, _d: Rectangle, image: NativeImage) => {
        const imageSize = image.getSize();
        if (!sizeEquals(imageSize, frameSize)) {
          // NOTE(Autokaka): We must ensure frame is ready on electron v41+
          resizeDrawable(cdp, frameSize);
          return;
        }
        const bitmap = image.toBitmap();
        const ts = decodeStego(bitmap, imageSize);
        if (ts === undefined || Math.abs(ts - ms) > 1) {
          lastTs = ts;
          laggy++;
          return;
        }
        win.webContents.off("paint", handler);
        win.webContents.stopPainting();
        resolve(Buffer.from(bitmap.buffer, bitmap.byteOffset, size.height * size.width * 4));
      };
      win.webContents.on("paint", handler);
      win.webContents.startPainting();
    });
  } finally {
    clearInterval(interval);
  }
}

export async function shoot(writer: IpcWriter, source: string, options: RenderOptions): Promise<IpcDonePayload> {
  const { fps, width, height, duration, withAudio, outFile, disableHwCodec } = options;
  if (withAudio) logger.warn(TAG, "audio will be ignored on this mode");

  await using pipeline = await EncoderPipeline.create({ width, height, fps, outFile, withAudio, disableHwCodec });

  const total = Math.ceil(fps * duration);
  const frameInterval = 1000 / fps;
  let written = 0;
  let progress = 0;

  const win = await loadWindow({ source, renderer: options });
  const cdp = win.webContents.debugger;
  const main = win.webContents.mainFrame;
  const iframe = main.frames[0];
  try {
    cdp.attach("1.3");

    win.webContents.setFrameRate(fps);
    win.webContents.stopPainting();

    await pauseVirtualTime(cdp);
    for (let frame = 0; frame < total; frame++) {
      const frameMs = (frame + 1) * frameInterval;

      const updated = Promise.all([tick(iframe, frameMs), swapBuffer(cdp, frameMs)]);
      await advanceVirtualTime(cdp, frameInterval);
      await updated;
      const bitmap = await paint({
        source,
        win,
        size: { width, height },
        ms: frameMs,
      });

      await pipeline.encodeBGRA(bitmap);
      written++;

      const newProgress = Math.floor((written / total) * 100);
      if (Math.abs(newProgress - progress) > 10) {
        progress = newProgress;
        writer.writeProgress(progress);
      }
    }
  } finally {
    cdp.detach();
    await disposeWindow(win);
    await pipeline.finish();
  }

  if (written === 0) {
    throw new Error("no frames captured");
  } else {
    return { written, jank: 0, outFile };
  }
}
