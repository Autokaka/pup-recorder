export interface WaitOptions {
    timeout: number;
    onTimeout?: () => void;
}
export declare class WaitableEvent {
    private _promise?;
    private _resolve?;
    private _timeoutToken?;
    wait(options?: WaitOptions): Promise<void>;
    signal(): void;
}
