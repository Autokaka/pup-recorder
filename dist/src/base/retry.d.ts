export interface RetryOptions<Args extends unknown[], Ret> {
    fn: (...args: Args) => Promise<Ret>;
    maxAttempts?: number;
    timeout?: number;
    signal?: AbortSignal;
}
export declare function useRetry<Args extends unknown[], Ret>({ fn, maxAttempts, timeout, signal, }: RetryOptions<Args, Ret>): (...args: Args) => Promise<Ret>;
