// Created by Autokaka (qq1909698494@gmail.com) on 2026/03/24.

import { mkdir, open } from "fs/promises";
import { dirname } from "path";
import { EncoderPipeline } from "../base/encoder/encoder";
import type { PupProgressCallback } from "../pup";
import type { RenderResult } from "./schema";

const PCM_CHANNELS = 2;

export interface EncodeBgraOptions {
  summary: RenderResult;
  outFile: string;
  signal?: AbortSignal;
  onProgress?: PupProgressCallback;
}

export async function encodeBgra({ summary, outFile, signal, onProgress }: EncodeBgraOptions): Promise<RenderResult> {
  const { options, written, jank, outFile: bgraFile, audio } = summary;
  const { width, height, fps, withAudio } = options;
  const frameSize = width * height * 4;
  const frameIntervalMs = 1000 / fps;

  await mkdir(dirname(outFile), { recursive: true });
  await using pipeline = await EncoderPipeline.create({ width, height, fps, outFile, withAudio });

  if (withAudio && audio) {
    pipeline.setupAudio(audio.pcmSampleRate);
  }

  const samplesPerFrame = audio ? Math.ceil(audio.pcmSampleRate / fps) : 0;
  const bytesPerFrame = samplesPerFrame * PCM_CHANNELS * 4;
  const silenceFrames = audio ? Math.floor(audio.pcmStartMs / frameIntervalMs) : 0;
  const silence = bytesPerFrame > 0 ? Buffer.alloc(bytesPerFrame) : undefined;

  const bgraFd = await open(bgraFile, "r");
  const pcmFd = audio ? await open(audio.pcmFile, "r") : undefined;

  try {
    const frameBuf = Buffer.allocUnsafe(frameSize);
    const audioBuf = bytesPerFrame > 0 ? Buffer.allocUnsafe(bytesPerFrame) : undefined;
    let lastProgress = 0;

    for (let i = 0; i < written; i++) {
      if (signal?.aborted) throw signal.reason;
      const { bytesRead } = await bgraFd.read(frameBuf, 0, frameSize);
      if (bytesRead < frameSize) throw new Error(`BGRA file truncated at frame ${i}`);
      await pipeline.encodeFrame(frameBuf);

      if (audioBuf && silence) {
        if (i < silenceFrames || !pcmFd) {
          await pipeline.encodeAudio(silence);
        } else {
          const { bytesRead: ab } = await pcmFd.read(audioBuf, 0, bytesPerFrame);
          if (ab < bytesPerFrame) audioBuf.fill(0, ab);
          await pipeline.encodeAudio(audioBuf);
        }
      }

      const progress = Math.floor(((i + 1) / written) * 100);
      if (progress - lastProgress >= 10) {
        lastProgress = progress;
        await onProgress?.(progress);
      }
    }
  } finally {
    await bgraFd.close();
    await pcmFd?.close();
  }

  const mp4Path = await pipeline.finish();
  return { options, written, jank, outFile: mp4Path };
}
