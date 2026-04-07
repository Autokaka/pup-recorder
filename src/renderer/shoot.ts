// Created by Autokaka (qq1909698494@gmail.com) on 2026/03/13.

import { type BrowserWindow, type NativeImage } from "electron";
import { advanceVirtualTime, pauseVirtualTime } from "../base/cdp";
import { EncoderPipeline } from "../base/encoder/encoder";
import { isEmpty } from "../base/image";
import { Lazy } from "../base/lazy";
import { logger } from "../base/logging";
import { IpcWriter, type IpcDonePayload } from "./ipc";
import type { RenderOptions } from "./schema";
import { decodeStego, startStego, stopStego } from "./stego";
import { buildTickInjector, doEject, doProcess } from "./tick";
import { loadWindow } from "./window";

const TAG = "[Shoot]";

function awaitStegoFrame(win: BrowserWindow, width: number, height: number, afterTs: number): Promise<Buffer> {
  return new Promise((resolve) => {
    const handler = (_e: unknown, _d: unknown, image: NativeImage) => {
      if (isEmpty(image)) return;
      const bitmap = image.toBitmap();
      const ts = decodeStego(bitmap, image.getSize());
      if (ts === undefined || ts < afterTs) {
        logger.warn(TAG, `skipping frame ${ts}, expected > ${afterTs}`);
        return;
      }
      win.webContents.stopPainting();
      win.webContents.off("paint", handler);
      resolve(Buffer.from(bitmap.buffer, bitmap.byteOffset, height * width * 4));
    };
    win.webContents.on("paint", handler);
  });
}

export async function shoot(writer: IpcWriter, source: string, options: RenderOptions): Promise<IpcDonePayload> {
  const { fps, width, height, duration, withAudio, outFile } = options;
  if (withAudio) logger.warn(TAG, "audio will be ignored on this mode");

  await using pipeline = await EncoderPipeline.create({ width, height, fps, outFile, withAudio });

  const total = Math.ceil(fps * duration);
  const frameInterval = 1000 / fps;
  let written = 0;
  let progress = 0;

  const win = await loadWindow({ source, renderer: options });
  const cdp = win.webContents.debugger;
  const rootFrame = new Lazy(() => win.webContents.mainFrame.frames[0]);
  try {
    cdp.attach("1.3");

    win.webContents.stopPainting();
    win.webContents.setFrameRate(fps);
    await pauseVirtualTime(cdp);

    const iframe = rootFrame.value;
    await iframe?.executeJavaScript(buildTickInjector());
    await iframe?.executeJavaScript(doProcess(0));
    await startStego(cdp);

    for (let frame = 0; frame < total; frame++) {
      const frameMs = (frame + 1) * frameInterval;
      const bitmap = awaitStegoFrame(win, width, height, frameMs - frameInterval / 2);

      await advanceVirtualTime(cdp, frameInterval);
      await iframe?.executeJavaScript(doProcess(frameMs));

      win.webContents.startPainting();
      await pipeline.encodeBGRA(await bitmap);
      written++;

      const newProgress = Math.floor((written / total) * 100);
      if (Math.abs(newProgress - progress) > 10) {
        progress = newProgress;
        writer.writeProgress(progress);
      }
    }
  } finally {
    await rootFrame.value?.executeJavaScript(doEject());
    await stopStego(cdp);
    cdp.detach();
    win.close();
    await pipeline.finish();
  }

  if (written === 0) {
    throw new Error("no frames captured");
  } else {
    return { written, jank: 0, outFile };
  }
}
