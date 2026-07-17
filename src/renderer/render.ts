// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/09.

import type { NativeImage, Size } from "electron";
import { BLANK_WARN_RATIO, BlankFrameStats } from "../base/blank_frame";
import { resizeDrawable } from "../base/cdp";
import { EncoderPipeline } from "../base/encoder/pipeline";
import { FrameDropStats } from "../base/frame_drop";
import { sizeEquals } from "../base/image";
import { logger } from "../base/logging";
import { periodical } from "../base/timing";
import { type AudioDisposal, attachAudioListeners } from "./audio";
import type { IpcDonePayload } from "./ipc";
import type { IPCRenderOptions } from "./schema";
import { ScreenshotTaker } from "./screenshot";
import { decodeStego, startStego } from "./stego";
import { disposeWindow, loadWindow } from "./window";

const TAG = "[Render]";

export async function render(options: IPCRenderOptions): Promise<IpcDonePayload> {
  const { source, fps, width, height, duration, withAudio, outFiles, disableHwCodec, signal, onProgress } = options;

  await using encoder = await EncoderPipeline.create({ width, height, fps, outFiles, withAudio, disableHwCodec });
  const taker = new ScreenshotTaker({ marks: options.screenshots, width, height, outFiles });

  const total = Math.ceil(fps * duration);
  const frameInterval = 1000 / fps;
  const frameSize: Size = { width, height: height + 1 };

  let written = 0;
  let lastFrame: Buffer | undefined;
  let screenshots: string[] = [];
  let lastWrittenTime: number | undefined;
  let progress = 0;
  let encodeError: Error | undefined;
  let resolver: (() => void) | undefined;
  let rejecter: ((reason?: unknown) => void) | undefined;
  let clearStuckCheck: VoidFunction | undefined;
  const blankStats = new BlankFrameStats(width, height);
  const dropStats = new FrameDropStats(fps);

  let disposeAudio: AudioDisposal | undefined;
  const scheduleFrame = (frame: Buffer) => {
    written++;
    blankStats.sample(frame);
    encoder.encodeBGRA(frame).catch((e) => (encodeError ??= e));
  };

  const paint = (_e: unknown, _r: unknown, image: NativeImage) => {
    encodeError ??= signal?.reason;
    if (encodeError) {
      rejecter?.(encodeError);
      return;
    }

    const imageSize = image.getSize();
    if (!sizeEquals(imageSize, frameSize)) {
      // NOTE(Autokaka): We must ensure frame is ready on electron v41+
      resizeDrawable(cdp, frameSize);
      return;
    }

    // Decode stego timestamp from the bottom pixel row without full bitmap copy
    const bitmap = image.toBitmap();
    const currentTime = decodeStego(bitmap, imageSize);
    if (currentTime === undefined) {
      encodeError ??= new Error(`no timestamp @ ${written}`);
      return;
    }

    // Skip frames that arrive too soon (< 80% of frame interval)
    if (lastWrittenTime !== undefined && currentTime - lastWrittenTime < frameInterval * 0.8) {
      return;
    }

    const cropped = Buffer.from(bitmap.buffer, bitmap.byteOffset, height * width * 4);
    lastFrame = cropped;
    taker.capture(currentTime, cropped);

    if (lastWrittenTime === undefined) {
      scheduleFrame(cropped);
      dropStats.wrote();
    } else {
      const timeDelta = currentTime - lastWrittenTime;
      if (timeDelta <= frameInterval * 1.2) {
        scheduleFrame(cropped);
        dropStats.wrote();
      } else {
        const framesToInsert = Math.round(timeDelta / frameInterval);
        dropStats.dropped(framesToInsert - 1);
        dropStats.wrote();
        for (let i = 0; i < framesToInsert && written < total; i++) {
          scheduleFrame(cropped);
        }
      }
    }
    lastWrittenTime = currentTime;

    const newProgress = Math.floor((written / total) * 100);
    if (newProgress !== progress) {
      progress = newProgress;
      onProgress(progress);
    }

    const durationMs = duration * 1000;
    if (currentTime >= durationMs - frameInterval * 0.5 || written >= total) {
      resolver?.();
    }
  };

  const win = await loadWindow({
    source,
    renderer: options,
    signal,
    onCreated: (win) => {
      if (withAudio) {
        disposeAudio = attachAudioListeners({
          wc: win.webContents,
          encoder,
          getVideoTimeMs: () => lastWrittenTime ?? 0,
          onError: (e: Error) => (encodeError ??= e),
        });
      }
    },
  });
  const cdp = win.webContents.debugger;

  try {
    win.webContents.stopPainting();
    win.webContents.setFrameRate(fps);
    win.webContents.on("paint", paint);
    win.webContents.startPainting();
    signal?.throwIfAborted();
    signal?.addEventListener("abort", () => rejecter?.(signal.reason), { once: true });
    await startStego(cdp);
    await new Promise<void>((r, j) => {
      [resolver, rejecter] = [r, j];
      let lastWritten = 0;
      let stuck = 0;
      clearStuckCheck = periodical(async () => {
        if (written !== lastWritten) {
          lastWritten = written;
          stuck = 0;
          return;
        }
        if (stuck >= 3) {
          rejecter?.(new Error(`renderer timeout @ ${written} lastTs ${lastWritten}`));
          return;
        }
        stuck++;
        const bmp = await win.webContents.capturePage().catch(() => null);
        if (bmp && !win.isDestroyed()) {
          paint(undefined, undefined, bmp);
        }
      }, 1000 / fps);
    });
  } finally {
    clearStuckCheck?.();
    win.webContents.off("paint", paint);
    await disposeWindow(win);
    disposeAudio?.();
    await encoder.finish();
    screenshots = await taker.finish(lastFrame);
  }

  if (encodeError || written === 0) {
    throw encodeError ?? new Error("no frames captured");
  } else {
    const blank = blankStats.finalize();
    if (blank >= BLANK_WARN_RATIO) {
      logger.warn(TAG, `${source} blank-frame ratio ${Math.round(blank * 100)}% — possible white/blank screen`);
    }
    return { written, outFiles, blank, screenshots, jank: dropStats.finalize().jank };
  }
}
