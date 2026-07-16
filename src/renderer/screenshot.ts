// Created by Autokaka (qq1909698494@gmail.com) on 2026/07/16.

import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { nativeImage } from "electron";

interface ScreenshotTarget {
  ms: number;
  index: number;
  path: string;
}

export interface ScreenshotOptions {
  marks: number[];
  width: number;
  height: number;
  outFiles: string[];
}

// Dumps painted BGRA frames to PNG at requested second marks; result order tracks input order.
export class ScreenshotTaker {
  private readonly _pending: ScreenshotTarget[];
  private readonly _done = new Map<number, string>();
  private readonly _writes: Promise<void>[] = [];

  constructor(private readonly _s: ScreenshotOptions) {
    const dir = dirname(_s.outFiles[0] ?? ".");
    this._pending = _s.marks
      .map((sec, index) => ({ ms: sec * 1000, index, path: join(dir, `screenshot_${index}.png`) }))
      .sort((a, b) => a.ms - b.ms);
  }

  // Dump every mark whose second has been reached by this frame.
  capture(currentTimeMs: number, bgra: Buffer): void {
    while (this._pending.length > 0 && this._pending[0]!.ms <= currentTimeMs) {
      this.take(this._pending.shift()!, bgra);
    }
  }

  // Recording over: snap any mark past the last frame onto it, then write all shots out.
  async finish(finalBgra?: Buffer): Promise<string[]> {
    while (finalBgra && this._pending.length > 0) {
      this.take(this._pending.shift()!, finalBgra);
    }
    await Promise.all(this._writes);
    return [...this._done.entries()].sort((a, b) => a[0] - b[0]).map(([, path]) => path);
  }

  private take(target: ScreenshotTarget, bgra: Buffer): void {
    const { width, height } = this._s;
    const png = nativeImage.createFromBitmap(bgra, { width, height }).toPNG();
    this._done.set(target.index, target.path);
    this._writes.push(writeFile(target.path, png));
  }
}
