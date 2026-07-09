// Created by Autokaka (qq1909698494@gmail.com) on 2026/07/03.

const GRID = 32; // resolution-independent 32×32 sample lattice
const BLANK_RANGE = 8; // max per-channel spatial spread (0-255) to treat a frame as contentless
export const BLANK_WARN_RATIO = 0.5; // blank-frame fraction above this warns at render end

// Blank = near-uniform: per-channel spatial range below threshold = nothing rendered (white/black/any solid screen).
export function isBlankFrame(bgra: Buffer, width: number, height: number): boolean {
  const stepX = Math.max(1, Math.floor(width / GRID));
  const stepY = Math.max(1, Math.floor(height / GRID));
  let rMin = 255;
  let rMax = 0;
  let gMin = 255;
  let gMax = 0;
  let bMin = 255;
  let bMax = 0;
  for (let y = 0; y < height; y += stepY) {
    for (let x = 0; x < width; x += stepX) {
      const i = (y * width + x) * 4;
      const b = bgra.readUInt8(i);
      const g = bgra.readUInt8(i + 1);
      const r = bgra.readUInt8(i + 2);
      rMin = Math.min(rMin, r);
      rMax = Math.max(rMax, r);
      gMin = Math.min(gMin, g);
      gMax = Math.max(gMax, g);
      bMin = Math.min(bMin, b);
      bMax = Math.max(bMax, b);
    }
  }
  return Math.max(rMax - rMin, gMax - gMin, bMax - bMin) <= BLANK_RANGE;
}

export class BlankFrameStats {
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
