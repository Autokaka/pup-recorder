// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/09.

import { type NativeImage } from "electron";
import { EncoderPipeline } from "../base/encoder/encoder";
import { FrameDropStats } from "../base/frame_drop";
import { isEmpty } from "../base/image";
import { setupAudioCapture, type AudioCapture } from "./audio";
import type { IpcDonePayload, IpcWriter } from "./ipc";
import type { RenderOptions } from "./schema";
import { decodeStego, startStego, stopStego } from "./stego";
import { loadWindow } from "./window";

export async function render(writer: IpcWriter, source: string, options: RenderOptions): Promise<IpcDonePayload> {
  const { fps, width, height, duration, withAudio, outFile } = options;

  await using encoder = await EncoderPipeline.create({ width, height, fps, outFile, withAudio });

  const total = Math.ceil(fps * duration);
  const frameInterval = 1000 / fps;

  let written = 0;
  let lastWrittenTime: number | undefined;
  let progress = 0;
  let encodeError: Error | undefined;
  let resolver: (() => void) | undefined;
  let rejecter: ((reason?: unknown) => void) | undefined;
  const dropStats = new FrameDropStats(fps);

  let audio: AudioCapture | undefined;
  const scheduleFrame = (frame: Buffer) => {
    written++;
    encoder.encodeBGRA(frame).catch((e) => (encodeError ??= e));
  };

  const paint = (_e: unknown, _r: unknown, image: NativeImage) => {
    if (encodeError) {
      rejecter?.(encodeError);
      return;
    }

    if (isEmpty(image)) return;

    const bitmap = image.toBitmap();
    const currentTime = decodeStego(bitmap, image.getSize());
    if (currentTime === undefined) {
      encodeError ??= new Error(`no timestamp @ ${written}`);
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
      writer.writeProgress(progress);
    }

    const durationMs = duration * 1000;
    if (currentTime >= durationMs - frameInterval * 0.5 || written >= total) {
      resolver?.();
    }
  };

  const win = await loadWindow({
    source,
    renderer: options,
    onCreated: async () => {
      if (withAudio) {
        audio = await setupAudioCapture({
          encoder,
          getVideoTimeMs: () => lastWrittenTime ?? 0,
          onError: (e) => (encodeError ??= e),
        });
      }
    },
  });
  const cdp = win.webContents.debugger;
  win.webContents.setFrameRate(fps);
  if (!win.webContents.isPainting()) win.webContents.startPainting();
  cdp.attach("1.3");
  win.webContents.on("paint", paint);

  try {
    await startStego(cdp);
    await new Promise<void>((r, j) => ([resolver, rejecter] = [r, j]));
  } finally {
    await stopStego(cdp);
    win.webContents.off("paint", paint);
    win.close();
    await audio?.teardown();
    await encoder.finish();
  }

  if (encodeError || written === 0) {
    throw encodeError ?? new Error("no frames captured");
  } else {
    const dropScore = dropStats.finalize();
    return { written, jank: dropScore.jank, outFile };
  }
}
