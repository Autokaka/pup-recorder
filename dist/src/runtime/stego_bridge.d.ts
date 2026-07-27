declare global {
    interface Window {
        __pup_stego_tick__?: () => void;
    }
}
export declare function installStegoBridge(): void;
