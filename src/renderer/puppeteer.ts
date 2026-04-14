// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/03.

import { mkdir } from "fs/promises";
import { dirname } from "path";
import puppeteer from "puppeteer";
import { chromiumOptions } from "../base/chromium";
import { EncoderPipeline } from "../base/encoder/pipeline";
import { logger } from "../base/logging";
import type { IpcDonePayload } from "./ipc";
import { type RenderOptions } from "./schema";
import { buildTickInjector, doEject, doProcess } from "./tick";

const TAG = "[Puppeteer]";

export async function doPuppeteer(
  source: string,
  options: RenderOptions,
  onProgress?: (p: number) => void,
): Promise<IpcDonePayload> {
  const { fps, width, height, duration, outFile, disableGpu, disableHwCodec } = options;
  if (options.withAudio) logger.warn(TAG, "audio capture is not supported in Puppeteer mode");

  const total = Math.ceil(fps * duration);
  const frameInterval = 1000 / fps;

  await mkdir(dirname(outFile), { recursive: true });
  await using pipeline = await EncoderPipeline.create({ width, height, fps, outFile, disableHwCodec });

  const browser = await puppeteer.launch({
    headless: "shell",
    defaultViewport: { width, height },
    args: (await chromiumOptions(disableGpu)).map((a) => `--${a}`),
  });

  try {
    const page = (await browser.pages())[0]!;

    const session = await page.createCDPSession();
    // Page.addScriptToEvaluateOnNewDocument must use the page's own CDP client.
    // HeadlessExperimental uses a separate session (see puppeteer-capture).
    // @ts-expect-error — _client() is a private Puppeteer API not exposed in type declarations
    const pageClient = page._client() as typeof session;

    const tickScript = buildTickInjector({ skipFrameGuard: true });
    const { identifier } = await pageClient.send("Page.addScriptToEvaluateOnNewDocument", { source: tickScript });

    try {
      await page.goto(source, { waitUntil: "networkidle0", timeout: 30_000 });

      for (const frame of page.frames()) {
        await frame.evaluate(tickScript);
        await frame.evaluate(doProcess(0));
      }

      await session.send("HeadlessExperimental.enable");

      // Trigger an initial render so any CSS animations start and fire animationStarted events.
      await session.send("HeadlessExperimental.beginFrame", {
        frameTimeTicks: 0,
        interval: frameInterval,
        noDisplayUpdates: false,
      });

      let written = 0;
      let progress = 0;
      let captureTimestamp = 0;
      let frameTimeTicks = frameInterval;

      for (let i = 0; i < total; i++) {
        captureTimestamp += frameInterval;

        await Promise.all(page.frames().map((frame) => frame.evaluate(doProcess(captureTimestamp))));

        const result = await session.send("HeadlessExperimental.beginFrame", {
          frameTimeTicks,
          interval: frameInterval,
          noDisplayUpdates: false,
          screenshot: { format: "png" },
        });
        frameTimeTicks += frameInterval;

        if (!result.screenshotData) {
          logger.warn(TAG, `frame ${i} produced no screenshot`);
          continue;
        }

        await pipeline.encodePNG(Buffer.from(result.screenshotData, "base64"));
        written++;

        const newProgress = Math.floor((written / total) * 100);
        if (Math.abs(newProgress - progress) > 10) {
          progress = newProgress;
          onProgress?.(progress);
        }
      }

      for (const frame of page.frames()) {
        if (!frame.detached) await frame.evaluate(doEject());
      }

      if (written === 0) throw new Error("no frames captured");
      return { written, jank: 0, outFile };
    } finally {
      await session.send("HeadlessExperimental.disable");
      await pageClient.send("Page.removeScriptToEvaluateOnNewDocument", { identifier });
      await session.detach();
    }
  } finally {
    await browser.close();
  }
}
