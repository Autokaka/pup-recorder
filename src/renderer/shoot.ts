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
        resolve(Buffer.from(bitmap.buffer, bitmap.byteOffset, size.height * size.width * 4));
        win.webContents.stopPainting();
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

  const tInit = performance.now();
  const winP = loadWindow({ source, renderer: options });
  await using pipeline = await EncoderPipeline.create({ width, height, fps, outFile, withAudio, disableHwCodec });
  const win = await winP;
  logger.debug(TAG, "init done:", { source, cost: performance.now() - tInit });

  const total = Math.ceil(fps * duration);
  const frameInterval = 1000 / fps;

  let written = 0;
  let progress = 0;
  let encodeError: Error | undefined;
  const cdp = win.webContents.debugger;
  const main = win.webContents.mainFrame;
  const iframe = main.frames[0];
  try {
    cdp.attach("1.3");

    win.webContents.setFrameRate(fps);
    win.webContents.stopPainting();
    await pauseVirtualTime(cdp);

    const t2 = performance.now();
    const updated = Promise.all([tick(iframe, 0), swapBuffer(cdp, 0)]);
    await advanceVirtualTime(cdp, frameInterval);
    await updated;
    await paint({ source, win, size: { width, height }, ms: 0 });
    logger.debug(TAG, "first frame:", { source, cost: performance.now() - t2 });

    for (let frame = 0; frame < total; frame++) {
      const frameMs = (frame + 1) * frameInterval;

      const updated = Promise.all([tick(iframe, frameMs), swapBuffer(cdp, frameMs)]);
      await advanceVirtualTime(cdp, frameInterval);
      await updated;
      const bitmap = await paint({ source, win, size: { width, height }, ms: frameMs });
      // Kick off encode without awaiting; pipeline limiter serializes internally.
      // Encode runs concurrent with next frame's CDP/paint setup.
      pipeline.encodeBGRA(bitmap).catch((e) => (encodeError ??= e));
      written++;
      if (encodeError) throw encodeError;

      const newProgress = Math.floor((written / total) * 100);
      if (Math.abs(newProgress - progress) > 10) {
        progress = newProgress;
        writer.writeProgress(progress);
      }
    }
  } finally {
    win.webContents.stopPainting();
    cdp.detach();
    await disposeWindow(win);
    await pipeline.finish();
  }

  if (encodeError) throw encodeError;
  if (written === 0) {
    throw new Error("no frames captured");
  } else {
    return { written, jank: 0, outFile };
  }
}
