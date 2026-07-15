import { FrameCache } from "./frame_cache";
import { type VideoState } from "./types";
declare global {
    interface Window {
        __pup_video__?: {
            advance: (ms: number) => Promise<unknown>;
            ready: () => Promise<void>;
        };
    }
    interface HTMLVideoElement {
        __pupLastSrc?: string;
    }
}
export declare class VideoHook {
    readonly sessions: WeakMap<HTMLVideoElement, VideoState>;
    readonly attaching: WeakMap<HTMLVideoElement, Promise<VideoState | undefined>>;
    readonly opening: Set<Promise<unknown>>;
    readonly cache: FrameCache;
    rvfcSeq: number;
    currMs: number;
    private _lastSnapshot;
    install(): void;
    attach(video: HTMLVideoElement, native?: boolean): Promise<VideoState | undefined>;
    ready(): Promise<void>;
    resume(video: HTMLVideoElement, state: VideoState): void;
    detach(video: HTMLVideoElement): void;
    onSrcChange(video: HTMLVideoElement): void;
    reattach(video: HTMLVideoElement, state: VideoState): void;
    private scan;
}
export declare function installVideoHook(): void;
