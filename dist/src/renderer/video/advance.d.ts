import type { WebFrameMain } from "electron";
export interface AdvanceOptions {
    frame: WebFrameMain | undefined;
    timestampMs: number;
    signal?: AbortSignal;
}
export declare function advanceVideos({ frame, timestampMs, signal }: AdvanceOptions): Promise<void>;
