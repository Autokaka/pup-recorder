// Created by Autokaka (qq1909698494@gmail.com) on 2026/03/13.

import type { BrowserWindow, Event, NativeImage, Rectangle, Size, WebContentsPaintEventParams } from "electron";
import { BLANK_WARN_RATIO, BlankFrameStats } from "../base/blank_frame";
import { advanceVirtualTime, pauseVirtualTime, resizeDrawable } from "../base/cdp";
import { EncoderPipeline } from "../base/encoder/pipeline";
import { sizeEquals } from "../base/image";
import { logger } from "../base/logging";
import type { IpcDonePayload } from "./ipc";
import type { IPCRenderOptions } from "./schema";
import { decodeStego, drawStego, FRAME_SYNC_MARKER_WIDTH, waitStegoTick } from "./stego";
import { tick } from "./tick";
import { useFrameProtocol } from "./video/protocol";
import { disposeWindow, loadWindow } from "./window";

const TAG = "[Shoot]";

interface PaintOptions {
  source: string;
  win: BrowserWindow;
  size: Size;
  ms: number;
}

// Painting stays on for the whole run; this only waits for the frame whose stego row matches `ms`.
async function paint({ source, win, size, ms }: PaintOptions): Promise<Buffer> {
  let lastTs: number | undefined;
  let stuck = 0;
  let interval: NodeJS.Timeout | undefined;
  const cdp = win.webContents.debugger;
  const frameSize: Size = { width: size.width, height: size.height + 1 };
  try {
    return await new Promise<Buffer>((resolve, reject) => {
      interval = setInterval(() => {
        if (stuck >= 3) {
          reject(new Error("drawable timeout"));
          return;
        }
        stuck++;
        logger.warn(TAG, `${source} render is extremely slow @ ${ms}, current: ${lastTs} with ${stuck} repeats`);
        win.webContents.invalidate();
      }, 1000);
      const handler = (_e: Event<WebContentsPaintEventParams>, _d: Rectangle, image: NativeImage) => {
        const imageSize = image.getSize();
        if (!sizeEquals(imageSize, frameSize)) {
          // NOTE(Autokaka): We must ensure frame is ready on electron v41+
          resizeDrawable(cdp, frameSize);
          return;
        }
        // Decode from a 2-row sliver first; the full-frame readback (~8MB memcpy) is paid only on the matching frame.
        const sliver = image.crop({ x: 0, y: frameSize.height - 2, width: FRAME_SYNC_MARKER_WIDTH, height: 2 });
        const ts = decodeStego(sliver.toBitmap(), { width: FRAME_SYNC_MARKER_WIDTH, height: 2 });
        if (ts === undefined || Math.abs(ts - ms) > 1) {
          lastTs = ts;
          return;
        }
        const bitmap = image.toBitmap();
        win.webContents.off("paint", handler);
        resolve(Buffer.from(bitmap.buffer, bitmap.byteOffset, size.height * size.width * 4));
      };
      win.webContents.on("paint", handler);
    });
  } finally {
    clearInterval(interval);
  }
}

export async function shoot(options: IPCRenderOptions): Promise<IpcDonePayload> {
  const { source, fps, width, height, duration, withAudio, outFile, disableHwCodec, signal, onProgress } = options;
  if (withAudio) {
    logger.warn(TAG, "audio will be ignored on this mode");
  }

  await using _ = useFrameProtocol(options.useInnerProxy);
  const tInit = performance.now();
  const winP = loadWindow({ source, renderer: options, signal });
  await using pipeline = await EncoderPipeline.create({ width, height, fps, outFile, withAudio, disableHwCodec });
  const win = await winP;
  logger.debug(TAG, "init done:", { source, cost: performance.now() - tInit });

  const total = Math.ceil(fps * duration);
  const frameInterval = 1000 / fps;

  let written = 0;
  let progress = 0;
  let encodeError: Error | undefined;
  const blankStats = new BlankFrameStats(width, height);
  const cdp = win.webContents.debugger;
  const main = win.webContents.mainFrame;
  const iframe = main.frames[0];
  try {
    // Compositor/capture cadence cap, NOT output fps; frames are damage-driven per virtual step.
    win.webContents.setFrameRate(240);
    await pauseVirtualTime(cdp);

    for (let frame = 0; frame < total; frame++) {
      signal?.throwIfAborted();
      const frameMs = (frame + 1) * frameInterval;

      const swapped = waitStegoTick(win.webContents);
      // Independent targets (iframe clock vs main-frame stego canvas): one concurrent hop instead of two serial ones.
      await Promise.all([tick({ frame: iframe, timestampMs: frameMs, signal }), drawStego(win.webContents, frameMs)]);
      await Promise.all([advanceVirtualTime(cdp, frameInterval), swapped]);
      const bitmap = await paint({ source, win, size: { width, height }, ms: frameMs });
      blankStats.sample(bitmap);
      // Encode without awaiting (limiter serializes), so it overlaps the next frame's CDP/paint setup.
      pipeline.encodeBGRA(bitmap).catch((e) => (encodeError ??= e));
      written++;
      if (encodeError) {
        throw encodeError;
      }

      const newProgress = Math.floor((written / total) * 100);
      if (newProgress !== progress) {
        progress = newProgress;
        onProgress(progress);
      }
    }
  } finally {
    await disposeWindow(win);
    await pipeline.finish();
  }

  if (encodeError) {
    throw encodeError;
  }
  if (written === 0) {
    throw new Error("no frames captured");
  } else {
    const blank = blankStats.finalize();
    if (blank >= BLANK_WARN_RATIO) {
      logger.warn(TAG, `${source} blank-frame ratio ${Math.round(blank * 100)}% — possible white/blank screen`);
    }
    return { written, jank: 0, outFile, blank };
  }
}
