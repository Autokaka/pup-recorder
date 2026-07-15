import type { VideoMeta } from "./frame_server";
export interface DecodedFrame {
    idx: number;
    buf: Buffer;
}
export declare function decodeFrames(src: string, meta: VideoMeta, signal: AbortSignal): AsyncGenerator<DecodedFrame>;
