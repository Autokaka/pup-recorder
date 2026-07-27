declare global {
    interface Window {
        __pup_tick__?: {
            process: (ms: number) => void;
        };
    }
}
export declare function installTickHook(): void;
