export declare const MAX_RENDER_ATTEMPTS = 3;
export declare function withRerender<T>(signal: AbortSignal, action: () => Promise<T>): Promise<T>;
