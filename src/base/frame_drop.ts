// Created by Autokaka (qq1909698494@gmail.com) on 2026/03/23.

/**
 * Frame drop quality score (0 = perfect, 1 = worst).
 *
 * Combines two dimensions:
 * - Global: overall drop rate across the timeline
 * - Local: perceptual severity of consecutive drops (bursts)
 *
 * Uses complementary multiplication: score = 1 - (1-g)(1-l)
 */
export interface FrameDropScore {
  global: number;
  local: number;
  jank: number;
  expected: number;
  actual: number;
  maxBurst: number;
}

export class FrameDropStats {
  private readonly _fps: number;
  private _actual = 0;
  private _currentBurst = 0;
  private _bursts: number[] = [];

  constructor(fps: number) {
    this._fps = fps;
  }

  /** Call when a frame is actually written to the encoder. */
  wrote(count = 1): void {
    if (this._currentBurst > 0) {
      this._bursts.push(this._currentBurst);
      this._currentBurst = 0;
    }
    this._actual += count;
  }

  /** Call when a frame is dropped. */
  dropped(count = 1): void {
    this._currentBurst += count;
  }

  /** Finalize and return the score. */
  finalize(): FrameDropScore {
    if (this._currentBurst > 0) {
      this._bursts.push(this._currentBurst);
      this._currentBurst = 0;
    }

    let totalDropped = 0;
    let localSum = 0;
    let maxBurst = 0;
    for (const burst of this._bursts) {
      totalDropped += burst;
      maxBurst = Math.max(maxBurst, burst);
      const perceptible = Math.max(0, burst - 1);
      localSum += (perceptible / this._fps) ** 2;
    }

    const expected = this._actual + totalDropped;
    const g = expected > 0 ? totalDropped / expected : 0;
    const l = Math.min(1, localSum);
    const score = 1 - (1 - g) * (1 - l);

    return { global: g, local: l, jank: score, expected, actual: this._actual, maxBurst };
  }
}
