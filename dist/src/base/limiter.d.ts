export declare class ConcurrencyLimiter {
    readonly maxConcurrency: number;
    private _active;
    private _queue;
    private _signals;
    private _resolve?;
    constructor(maxConcurrency: number);
    get active(): number;
    get pending(): number;
    get stats(): string;
    schedule<T>(fn: () => Promise<T>, signal?: AbortSignal): Promise<T>;
    drain(): Promise<void>;
    private flush;
    private next;
}
