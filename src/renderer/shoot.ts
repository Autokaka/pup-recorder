// Created by Autokaka (qq1909698494@gmail.com) on 2026/03/13.

import type { BrowserWindow, NativeImage, Size } from "electron";
import { advanceVirtualTime, pauseVirtualTime, rebuildDrawable, resizeDrawable } from "../base/cdp";
import { EncoderPipeline } from "../base/encoder/pipeline";
import { sizeEquals } from "../base/image";
import { logger } from "../base/logging";
import { BLANK_WARN_RATIO, BlankStats } from "../base/quality/blank";
import { DropStats, JANK_WARN_SCORE } from "../base/quality/drop";
import { periodical } from "../base/timing";
import type { IpcDonePayload } from "./ipc";
import type { IPCRenderOptions } from "./schema";
import { ScreenshotTaker } from "./screenshot";
import { decodeStego, drawStego, FRAME_SYNC_MARKER_WIDTH, waitStegoTick } from "./stego";
import { tick } from "./tick";
import { useFrameProtocol } from "./video/protocol";
import { disposeWindow, loadWindow } from "./window";

const TAG = "[Shoot]";
const RENDER_FPS = 240;
const PAINT_HOLD_LIMIT = 10;

interface PaintOptions {
  source: string;
  fps: number;
  win: BrowserWindow;
  size: Size;
  ms: number;
}

// Painting stays on for the whole run; waits for the frame whose stego row matches `ms`, undefined on timeout.
async function paint({ win, fps, size, ms }: PaintOptions): Promise<Buffer | undefined> {
  let clearDirtyCheck: VoidFunction | undefined;
  const cdp = win.webContents.debugger;
  const frameSize: Size = { width: size.width, height: size.height + 1 };
  try {
    return await new Promise<Buffer | undefined>((resolve) => {
      const handler = (_e: unknown, _d: unknown, image: NativeImage) => {
        const imageSize = image.getSize();
        if (!sizeEquals(imageSize, frameSize)) {
          // NOTE(Autokaka): must ensure frame ready on electron v41+; teardown detach may reject the in-flight send.
          resizeDrawable(cdp, frameSize).catch(() => {});
          return;
        }
        // Decode from a 2-row sliver first; the full-frame readback (~8MB memcpy) is paid only on the matching frame.
        const sliver = image.crop({ x: 0, y: frameSize.height - 2, width: FRAME_SYNC_MARKER_WIDTH, height: 2 });
        const ts = decodeStego(sliver.toBitmap(), { width: FRAME_SYNC_MARKER_WIDTH, height: 2 });
        if (ts === undefined || Math.abs(ts - ms) > 1) {
          return;
        }
        const bitmap = image.toBitmap();
        win.webContents.off("paint", handler);
        resolve(Buffer.from(bitmap.buffer, bitmap.byteOffset, size.height * size.width * 4));
      };
      win.webContents.on("paint", handler);
      clearDirtyCheck = periodical(async (times) => {
        if (times <= PAINT_HOLD_LIMIT) {
          // Teardown detach rejects in-flight CDP sends; a lost repaint kick is harmless.
          await rebuildDrawable(cdp, frameSize).catch(() => {});
        } else {
          logger.warn(TAG, `paint timeout @ ${ms}`);
          win.webContents.off("paint", handler);
          resolve(undefined);
        }
        return undefined;
      }, 1000 / fps);
    });
  } finally {
    clearDirtyCheck?.();
  }
}

export async function shoot(options: IPCRenderOptions): Promise<IpcDonePayload> {
  const { source, fps, width, height, duration, withAudio, outFiles, disableHwCodec, signal, onProgress } = options;
  if (withAudio) {
    logger.warn(TAG, "audio will be ignored on this mode");
  }
  const taker = new ScreenshotTaker({ marks: options.screenshots, width, height, outFiles });

  await using _ = useFrameProtocol(options.useInnerProxy);
  const tInit = performance.now();
  const winP = loadWindow({ source, renderer: options, signal });
  await using pipeline = await EncoderPipeline.create({ width, height, fps, outFiles, withAudio, disableHwCodec });
  const win = await winP;
  logger.debug(TAG, "init done:", { source, cost: Math.round(performance.now() - tInit) });

  const total = Math.ceil(fps * duration);
  const frameInterval = 1000 / fps;

  let written = 0;
  let progress = 0;
  let held = 0;
  let lastBitmap: Buffer | undefined;
  let screenshots: string[] = [];
  let encodeError: Error | undefined;
  const blankStats = new BlankStats(width, height);
  const dropStats = new DropStats(fps);
  const cdp = win.webContents.debugger;
  const main = win.webContents.mainFrame;
  const iframe = main.frames[0];
  try {
    // Compositor/capture cadence cap, NOT output fps; frames are damage-driven per virtual step.
    win.webContents.setFrameRate(RENDER_FPS);
    await pauseVirtualTime(cdp);

    for (let frame = 0; frame < total; frame++) {
      signal?.throwIfAborted();
      const frameMs = (frame + 1) * frameInterval;

      // Arm before drawStego so the commit ack can't be missed; branch catch keeps an early tick failure from orphaning it.
      const swapped = waitStegoTick(win.webContents);
      swapped.catch(() => {});
      // Independent targets (iframe clock vs main-frame stego canvas): one concurrent hop instead of two serial ones.
      await Promise.all([tick({ frame: iframe, timestampMs: frameMs, signal }), drawStego(win.webContents, frameMs)]);
      await Promise.all([advanceVirtualTime(cdp, frameInterval), swapped]);
      const painted = await paint({ source, fps, win, size: { width, height }, ms: frameMs });
      if (painted) {
        held = 0;
        dropStats.wrote();
      } else {
        held++;
        dropStats.dropped(1);
      }
      const bitmap = painted ?? lastBitmap;
      if (!bitmap || held >= PAINT_HOLD_LIMIT) {
        throw new Error(`renderer exausted @ ${frameMs}`);
      }
      lastBitmap = bitmap;
      taker.capture(frameMs, bitmap);
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
    screenshots = await taker.finish(lastBitmap);
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
    const { jank } = dropStats.finalize();
    if (jank >= JANK_WARN_SCORE) {
      logger.warn(TAG, `${source} jank score ${jank.toFixed(2)} — frames held past paint timeout`);
    }
    return { written, outFiles, blank, jank, screenshots };
  }
}
