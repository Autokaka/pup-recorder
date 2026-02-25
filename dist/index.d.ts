import { ChildProcess, SpawnOptions } from 'child_process';

declare const pupAppPath: string;
declare const pupLogLevel: number;
declare const pupUseInnerProxy: boolean;
declare const pupFFmpegPath: string;

type EnvParser<T> = (value: unknown) => T;
declare function penv<T>(name: string, parser: EnvParser<T>, defaultValue: T): T;
declare function penv<T>(name: string, parser: EnvParser<T>, defaultValue?: T): T | undefined;

declare class Lazy<T> {
    readonly makeValue: () => T;
    constructor(makeValue: () => T);
    get value(): T;
    get initialized(): boolean;
    private _initialized;
    private _value;
}

declare class ConcurrencyLimiter {
    readonly maxConcurrency: number;
    private _active;
    private _queue;
    private _pending;
    private _ended;
    constructor(maxConcurrency: number);
    get active(): number;
    get pending(): number;
    schedule<T>(fn: () => Promise<T>): Promise<T>;
    end(): Promise<void>;
    private next;
}

interface LoggerLike {
    debug?(this: void, ...messages: unknown[]): void;
    info?(this: void, ...messages: unknown[]): void;
    warn?(this: void, ...messages: unknown[]): void;
    error?(this: void, ...messages: unknown[]): void;
}
declare class Logger implements LoggerLike {
    private _impl?;
    get impl(): LoggerLike | undefined;
    set impl(value: LoggerLike);
    constructor();
    debug(...messages: unknown[]): void;
    info(...messages: unknown[]): void;
    warn(...messages: unknown[]): void;
    error(...messages: unknown[]): void;
    fatal(...messages: unknown[]): never;
    private dispatch;
    attach(proc: ChildProcess, name: string): Promise<void>;
}
declare const logger: Logger;

declare function noerr<Fn extends (...args: any[]) => any, D>(fn: Fn, defaultValue: D): (...args: Parameters<Fn>) => ReturnType<Fn> | D;

declare function parseNumber(value: unknown): number;

declare const PUP_ARGS_ENV_KEY = "__PUP_ARGS__";
declare function pargs(): string[];
interface ProcessHandle {
    process: ChildProcess;
    wait: Promise<void>;
}
declare function exec(cmd: string, options?: SpawnOptions): ProcessHandle;

interface RetryOptions<Args extends any[], Ret> {
    fn: (...args: Args) => Promise<Ret>;
    maxAttempts?: number;
    timeout?: number;
}
declare function useRetry<Args extends any[], Ret>({ fn, maxAttempts, timeout, }: RetryOptions<Args, Ret>): (...args: Args) => Promise<Ret>;

declare function sleep(ms: number): Promise<void>;
declare function periodical(callback: (count: number) => Promise<void> | void, ms: number): () => void;

type AbortQuery = () => Promise<boolean> | boolean;

type PupProgressCallback = (progress: number) => Promise<void> | void;
interface PupOptions {
    withAlphaChannel?: boolean;
    width?: number;
    height?: number;
    fps?: number;
    duration?: number;
    outDir?: string;
    cancelQuery?: AbortQuery;
    onProgress?: PupProgressCallback;
}
declare function pup(source: string, options: PupOptions): Promise<{
    width: number;
    height: number;
    fps: number;
    duration: number;
    cover: string;
    mp4?: string;
    webm?: string;
    mov?: string;
}>;

export { ConcurrencyLimiter, type EnvParser, Lazy, type LoggerLike, PUP_ARGS_ENV_KEY, type ProcessHandle, type PupOptions, type RetryOptions, exec, logger, noerr, pargs, parseNumber, penv, periodical, pup, pupAppPath, pupFFmpegPath, pupLogLevel, pupUseInnerProxy, sleep, useRetry };
