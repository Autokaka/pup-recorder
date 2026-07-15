import type { LoggerLike } from "./logging";
interface BarOptions {
    total: number;
    out: NodeJS.WriteStream;
    showCount?: boolean;
}
export declare class ProgressBar {
    private _written;
    private _shown;
    private readonly _total;
    private readonly _out;
    private readonly _tty;
    private readonly _showCount;
    constructor(opts: BarOptions);
    get total(): number;
    update(written: number): void;
    updatePercent(pct: number): void;
    clear(): void;
    redraw(): void;
    log(line: string): void;
    finish(line: string): void;
    private render;
}
export declare function barLogger(bar: ProgressBar): LoggerLike;
export {};
