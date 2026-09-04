// Created by Autokaka (qq1909698494@gmail.com) on 2026/03/13.

// A composite handed to the gate: the stego row timestamp it matched and full BGRA pixels.
export interface CapturedFrame {
  ts: number;
  pix: Buffer;
}

export interface FrameGateOptions {
  width: number;
  height: number;
  // How long to watch after the first match before falling back to the baseline frame.
  windowMs: number;
}

// First frame only: hold the first match as baseline and accept the first later composite whose pixels differ at all; expired() covers a window that closed unchanged.
export class FirstFrameGate {
  private _baseline: CapturedFrame | undefined;
  private _baselineAt = 0;

  constructor(private readonly _opts: FrameGateOptions) {}

  // The baseline frame: the page's true first frame once the watch window expired unchanged.
  get baseline(): CapturedFrame | undefined {
    return this._baseline;
  }

  // Returns the frame to capture once a real first paint shows up, undefined while still watching.
  accept(frame: CapturedFrame, now: number): CapturedFrame | undefined {
    if (!this._baseline) {
      this._baseline = frame;
      this._baselineAt = now;
      return undefined;
    }
    return hasDiff(this._baseline.pix, frame.pix, this._opts) ? frame : undefined;
  }

  // True once the window after the first match has passed without any differing frame.
  expired(now: number): boolean {
    return this._baseline !== undefined && now - this._baselineAt >= this._opts.windowMs;
  }
}

// True when any sampled pixel differs between two BGRA frames; exits at the first difference found.
function hasDiff(a: Buffer, b: Buffer, size: { width: number; height: number }): boolean {
  for (let y = 0; y < size.height; y += 4) {
    const row = y * size.width * 4;
    for (let x = 0; x < size.width; x += 4) {
      const i = row + x * 4;
      if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) {
        return true;
      }
    }
  }
  return false;
}
