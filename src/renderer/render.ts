// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/09.

import { type NativeImage } from "electron";
import { mkdir, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { FrameDropStats } from "../base/frame_drop";
import { isEmpty } from "../base/image";
import { logger } from "../base/logging";
import { FixedBufferWriter } from "../rust/lib";
import { setupAudioCapture } from "./audio_capture";
import { decodeTimestamp, startSync, stopSync } from "./frame_sync";
import type { RenderOptions, RenderResult } from "./schema";
import { loadWindow } from "./window";

const TAG = "[Render]";

export async function render(source: string, options: RenderOptions): Promise<void> {
  const { outFile, fps, width, height, duration, withAudio } = options;
  const outDir = dirname(outFile);
  const bgraFile = join(outDir, "output.bgra");

  logger.info(TAG, `progress: 0%`);
  await mkdir(outDir, { recursive: true });

  const frameSize = width * height * 4;
  const writer = new FixedBufferWriter(bgraFile, frameSize);
  const total = Math.ceil(fps * duration);
  const frameInterval = 1000 / fps;

  let written = 0;
  let lastWrittenTime: number | undefined;
  let progress = 0;
  let frameError: Error | undefined;
  let resolver: (() => void) | undefined;
  let rejecter: ((reason?: unknown) => void) | undefined;
  const dropStats = new FrameDropStats(fps);

  const audio = withAudio ? await setupAudioCapture(outDir, () => lastWrittenTime ?? 0) : undefined;
  const scheduleFrame = (frame: Buffer) => {
    written++;
    writer.write(frame);
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

    if (lastWrittenTime === undefined) {
      scheduleFrame(cropped);
      dropStats.wrote();
      lastWrittenTime = currentTime;
    } else {
      const timeDelta = currentTime - lastWrittenTime;
      if (timeDelta >= frameInterval * 0.8) {
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

  const win = await loadWindow(source, options);
  const cdp = win.webContents.debugger;
  win.webContents.setFrameRate(fps);
  if (!win.webContents.isPainting()) win.webContents.startPainting();
  cdp.attach("1.3");
  win.webContents.on("paint", paint);

  try {
    await startSync(cdp);
    await new Promise<void>((r, j) => ([resolver, rejecter] = [r, j]));
  } finally {
    await stopSync(cdp);
    win.webContents.off("paint", paint);
    win.close();
  }

  await writer.close();

  if (frameError || written === 0) {
    throw frameError ?? new Error("no frames captured");
  }

  const audioSpec = await audio?.teardown();
  const dropScore = dropStats.finalize();

  const result: RenderResult = { options, written, jank: dropScore.jank, outFile: bgraFile, audio: audioSpec };
  await writeFile(outFile, JSON.stringify(result));
  logger.info(
    TAG,
    `progress: 100%,`,
    `written: ${written},`,
    `jank: ${dropScore.jank.toFixed(3)}`,
    `(global=${dropScore.global.toFixed(3)},`,
    `local=${dropScore.local.toFixed(3)}, maxBurst=${dropScore.maxBurst})`,
  );
}
