import { type VideoCache, type VideoState } from "./types";
export declare class FrameCache {
    private _caches;
    cacheOf(id: string): VideoCache;
    fetch(state: VideoState, idx: number): Promise<ImageBitmap | undefined>;
    prefetch(state: VideoState, fromIdx: number, count: number): void;
    evict(c: VideoCache): void;
    release(id: string, state: VideoState): void;
}
