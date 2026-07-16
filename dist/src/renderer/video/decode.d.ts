import type { VideoMeta } from "./frame_server";
export interface DecodedFrame {
    idx: number;
    buf: Buffer;
}
export interface DecodeFramesOptions {
    src: string;
    meta: VideoMeta;
    signal: AbortSignal;
}
export declare function decodeFrames({ src, meta, signal }: DecodeFramesOptions): AsyncGenerator<DecodedFrame>;
