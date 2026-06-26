// Created by Autokaka (qq1909698494@gmail.com) on 2026/05/26.

import type { LoggerLike } from "./logging";

const BAR_WIDTH = 40;

interface BarOptions {
  total: number;
  out: NodeJS.WriteStream;
  showCount?: boolean;
}

export class ProgressBar {
  private _written = 0;
  private _shown = false;
  private readonly _total: number;
  private readonly _out: NodeJS.WriteStream;
  private readonly _tty: boolean;
  private readonly _showCount: boolean;

  constructor(opts: BarOptions) {
    this._total = opts.total;
    this._out = opts.out;
    this._tty = !!opts.out.isTTY;
    this._showCount = opts.showCount ?? false;
  }

  get total(): number {
    return this._total;
  }

  update(written: number): void {
    this._written = Math.min(this._total, Math.max(0, written));
    this.render();
  }

  updatePercent(pct: number): void {
    this.update(Math.round((pct / 100) * this._total));
  }

  clear(): void {
    if (this._tty && this._shown) {
      this._out.write("\r\x1b[2K");
    }
  }

  redraw(): void {
    this.render();
  }

  log(line: string): void {
    this.clear();
    this._out.write(`${line}\n`);
    this.redraw();
  }

  finish(line: string): void {
    this.clear();
    this._out.write(`${line}\n`);
    this._shown = false;
  }

  private render(): void {
    if (!this._tty) {
      return;
    }
    if (this._written === 0 && !this._shown) {
      return;
    }
    const ratio = this._total > 0 ? this._written / this._total : 0;
    const filled = Math.round(ratio * BAR_WIDTH);
    const bar = "#".repeat(filled) + "-".repeat(BAR_WIDTH - filled);
    const pct = Math.round(ratio * 100);
    const suffix = this._showCount ? `${this._written}/${this._total} (${pct}%)` : `${pct}%`;
    this._out.write(`\r[${bar}] ${suffix}`);
    this._shown = true;
  }
}

// Around each console.* call, clear the bar line then redraw — keeps native console coloring intact.
export function barLogger(bar: ProgressBar): LoggerLike {
  const wrap =
    <T extends (...a: unknown[]) => void>(fn: T) =>
    (...args: unknown[]) => {
      bar.clear();
      fn(...args);
      bar.redraw();
    };
  return {
    debug: wrap(console.debug),
    info: wrap(console.info),
    warn: wrap(console.warn),
    error: wrap(console.error),
  };
}
