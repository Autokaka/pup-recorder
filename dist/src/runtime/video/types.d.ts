export declare const SCHEME = "pup-frame://";
export declare const AHEAD = 10;
export declare const TAG = "[VideoHook]";
export declare const MEDIA_ERR_NETWORK = 2;
export declare const MEDIA_ERR_DECODE = 3;
export declare const HAVE_NOTHING = 0;
export declare const HAVE_METADATA = 1;
export declare const HAVE_ENOUGH_DATA = 4;
export declare const NETWORK_EMPTY = 0;
export declare const NETWORK_IDLE = 1;
export declare const NETWORK_LOADING = 2;
export declare const NETWORK_NO_SOURCE = 3;
export interface VideoMeta {
    id: string;
    width: number;
    height: number;
    frameWidth: number;
    frameHeight: number;
    duration: number;
    fps: number;
}
export interface VideoFrameMeta {
    presentationTime: number;
    expectedDisplayTime: number;
    width: number;
    height: number;
    mediaTime: number;
    presentedFrames: number;
}
export type FrameCb = (now: number, meta: VideoFrameMeta) => void;
export interface MediaErrorLike {
    code: number;
    message: string;
}
export interface VideoCache {
    bitmaps: Map<number, ImageBitmap>;
    inFlight: Map<number, Promise<ImageBitmap | undefined>>;
    readers: Map<VideoState, number>;
}
export interface VideoState {
    meta?: VideoMeta;
    cv: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    paused: boolean;
    currentTime: number;
    ended: boolean;
    lastDrawnIdx: number;
    dead: boolean;
    objectFit: string;
    readyState: number;
    networkState: number;
    seeking: boolean;
    waiting: boolean;
    error: MediaErrorLike | undefined;
    presentedFrames: number;
    maxReached: number;
    rvfc: Map<number, FrameCb>;
}
export interface TimeRangesLike {
    length: number;
    start(i: number): number;
    end(i: number): number;
}
export declare function timeRanges(end: number): TimeRangesLike;
export declare function fire(el: EventTarget, type: string): void;
