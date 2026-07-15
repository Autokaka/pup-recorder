export declare function sleep(ms: number): Promise<void>;
export declare function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T>;
export declare function abortable<T>(p: Promise<T>, signal?: AbortSignal): Promise<T>;
export declare function periodical(callback: (count: number) => Promise<number | undefined> | undefined, ms: number): () => void;
