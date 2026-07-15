import type { VideoHook } from "./hook";
import { type VideoState } from "./types";
export interface AttachArgs {
    video: HTMLVideoElement;
    state: VideoState;
    src: string;
    birthMs: number;
    native: boolean;
}
export declare function newVideoState(video: HTMLVideoElement, cv: HTMLCanvasElement): VideoState;
export declare function openSession(hook: VideoHook, args: AttachArgs): Promise<VideoState | undefined>;
