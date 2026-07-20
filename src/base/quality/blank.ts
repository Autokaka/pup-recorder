// Created by Autokaka (qq1909698494@gmail.com) on 2026/07/03.

const GRID = 32; // resolution-independent lattice for the modal-color pre-pass
const STRIDE = 4; // main-scan step; row-staggered so any ≥1px structure lands on a sample within 4 rows
const CONTENT_DELTA = 8; // max per-channel distance (0-255) still counted as the dominant color
const MIN_CONTENT_SAMPLES = 16; // rendered frames are noise-free, so a handful of off-dominant samples is real content
export const BLANK_WARN_RATIO = 0.5; // blank-frame fraction above this warns at render end

// 5 bits per channel, alpha included — transparent surfaces carry content in coverage, not color.
function quantize(bgra: Buffer, i: number): number {
  return (
    (bgra.readUInt8(i) >> 3) |
    ((bgra.readUInt8(i + 1) >> 3) << 5) |
    ((bgra.readUInt8(i + 2) >> 3) << 10) |
    ((bgra.readUInt8(i + 3) >> 3) << 15)
  );
}

// Byte offset of a pixel carrying the frame's dominant color (mode over a sparse lattice).
function modalPixel(bgra: Buffer, width: number, height: number): number {
  const stepX = Math.max(1, Math.floor(width / GRID));
  const stepY = Math.max(1, Math.floor(height / GRID));
  const counts = new Map<number, number>();
  const firstIdx = new Map<number, number>();
  let best = 0;
  let bestCount = 0;
  for (let y = 0; y < height; y += stepY) {
    for (let x = 0; x < width; x += stepX) {
      const i = (y * width + x) * 4;
      const key = quantize(bgra, i);
      const count = (counts.get(key) ?? 0) + 1;
      counts.set(key, count);
      if (!firstIdx.has(key)) {
        firstIdx.set(key, i);
      }
      if (count > bestCount) {
        bestCount = count;
        best = key;
      }
    }
  }
  return firstIdx.get(best) ?? 0;
}

// Blank = dominant-color coverage: fewer than MIN_CONTENT_SAMPLES samples deviate from the modal color.
export function isBlankFrame(bgra: Buffer, width: number, height: number): boolean {
  const m = modalPixel(bgra, width, height);
  const mb = bgra.readUInt8(m);
  const mg = bgra.readUInt8(m + 1);
  const mr = bgra.readUInt8(m + 2);
  const ma = bgra.readUInt8(m + 3);
  let content = 0;
  for (let y = 0; y < height; y += STRIDE) {
    const offset = (y >> 2) & (STRIDE - 1);
    for (let x = offset; x < width; x += STRIDE) {
      const i = (y * width + x) * 4;
      if (
        Math.abs(bgra.readUInt8(i) - mb) > CONTENT_DELTA ||
        Math.abs(bgra.readUInt8(i + 1) - mg) > CONTENT_DELTA ||
        Math.abs(bgra.readUInt8(i + 2) - mr) > CONTENT_DELTA ||
        Math.abs(bgra.readUInt8(i + 3) - ma) > CONTENT_DELTA
      ) {
        content++;
        if (content >= MIN_CONTENT_SAMPLES) {
          return false;
        }
      }
    }
  }
  return true;
}

export class BlankStats {
  private readonly _width: number;
  private readonly _height: number;
  private _total = 0;
  private _blank = 0;

  constructor(width: number, height: number) {
    this._width = width;
    this._height = height;
  }

  sample(frame: Buffer): void {
    this._total++;
    if (isBlankFrame(frame, this._width, this._height)) {
      this._blank++;
    }
  }

  // Fraction of written frames that were contentless (0 = all had content, 1 = all blank).
  finalize(): number {
    return this._total > 0 ? this._blank / this._total : 0;
  }
}
