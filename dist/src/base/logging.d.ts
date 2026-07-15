import type { ChildProcess } from "node:child_process";
export interface LoggerLike {
    debug?(this: void, ...messages: unknown[]): void;
    info?(this: void, ...messages: unknown[]): void;
    warn?(this: void, ...messages: unknown[]): void;
    error?(this: void, ...messages: unknown[]): void;
}
export declare class Logger implements LoggerLike {
    private _level;
    private _impl?;
    get level(): number;
    set level(value: number);
    get impl(): LoggerLike | undefined;
    set impl(value: LoggerLike);
    constructor(_level?: number);
    debug(...messages: unknown[]): void;
    info(...messages: unknown[]): void;
    warn(...messages: unknown[]): void;
    error(...messages: unknown[]): void;
    fatal(...messages: unknown[]): void;
    private dispatch;
    attach(proc: ChildProcess, name: string): Promise<void>;
}
declare const logger: Logger;
export { logger };
