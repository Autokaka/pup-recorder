// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/09.

import { ok } from "assert";
import { nativeImage, type NativeImage } from "electron";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { EncoderPipeline } from "../base/encoder/encoder";
import { isEmpty } from "../base/image";
import { ConcurrencyLimiter } from "../base/limiter";
import { logger } from "../base/logging";
import { setupAudioCapture } from "./audio_capture";
import { decodeTimestamp, startSync, stopSync } from "./frame_sync";
import type { RenderOptions, RenderResult } from "./schema";
import { loadWindow } from "./window";

const TAG = "[Render]";

export async function render(source: string, options: RenderOptions): Promise<void> {
  logger.info(TAG, `progress: 0%`);
  const { outDir, fps, width, height, duration, withAudio, formats } = options;

  await mkdir(outDir, { recursive: true });

  const pipeline = await EncoderPipeline.create({ width, height, fps, formats, outDir, withAudio });
  const audioCapture = withAudio ? await setupAudioCapture(pipeline) : undefined;

  const win = await loadWindow(source, options);
  try {
    const cdp = win.webContents.debugger;
    cdp.attach("1.3");

    win.webContents.setFrameRate(fps);
    if (!win.webContents.isPainting()) {
      win.webContents.startPainting();
    }

    const total = Math.ceil(fps * duration);
    const frameInterval = 1000 / fps;

    let written = 0;
    let lastWrittenTime: number | undefined;
    let progress = 0;
    let frameError: Error | undefined;
    let resolver: (() => void) | undefined;
    let rejecter: ((reason?: unknown) => void) | undefined;
    let coverBgra: Buffer | undefined;
    const encodeQueue = new ConcurrencyLimiter(1);

    const scheduleFrame = (frame: Buffer, timestampUs: number) => {
      written++;
      const t0 = performance.now();
      encodeQueue //
        .schedule(() => pipeline.encodeFrame(frame, timestampUs))
        .catch((e) => (frameError ??= e));
      const diff = performance.now() - t0;
      if (diff > frameInterval * 1.2) {
        logger.warn(TAG, `frame stalled in ${diff}ms`);
      }
    };

    const paint = (_e: unknown, _r: unknown, image: NativeImage) => {
      if (frameError) {
        rejecter?.(frameError);
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
      const cropped = Buffer.from(bitmap.buffer, bitmap.byteOffset, height * bytesPerRow);

      coverBgra ??= cropped;

      if (lastWrittenTime === undefined) {
        scheduleFrame(cropped, currentTime * 1000);
        lastWrittenTime = currentTime;
      } else {
        const timeDelta = currentTime - lastWrittenTime;
        if (timeDelta >= frameInterval * 0.8) {
          if (timeDelta <= frameInterval * 1.2) {
            scheduleFrame(cropped, currentTime * 1000);
          } else {
            const framesToInsert = Math.round(timeDelta / frameInterval);
            for (let i = 0; i < framesToInsert && written < total; i++) {
              scheduleFrame(cropped, Math.round((lastWrittenTime + (i + 1) * frameInterval) * 1000));
            }
          }
          lastWrittenTime = currentTime;
        }
      }

      const newProgress = Math.floor((written / total) * 100);
      if (Math.abs(newProgress - progress) > 10) {
        progress = newProgress;
        logger.info(TAG, `progress: ${Math.round(progress)}%`);
      }

      const durationMs = duration * 1000;
      if (currentTime >= durationMs - frameInterval * 0.5 || written >= total) {
        resolver?.();
      }
    };

    win.webContents.on("paint", paint);
    await startSync(cdp);
    try {
      await new Promise<void>((r, j) => ([resolver, rejecter] = [r, j]));
    } finally {
      await stopSync(cdp);
      win.webContents.off("paint", paint);
      await audioCapture?.teardown();
    }

    if (frameError || written === 0) {
      throw frameError ?? new Error("no frames captured");
    }

    await encodeQueue.end();
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
