import type { VideoMeta } from "./frame_server";
export interface DecodedFrame {
    idx: number;
    buf: Buffer;
}
export interface DecodeFramesOptions {
    src: string;
    meta: VideoMeta;
    signal: AbortSignal;
    /** 1-based content frame to resume decoding from; a failed seek falls back to decoding the whole head. */
    fromIdx?: number;
}
export declare function decodeFrames({ src, meta, signal, fromIdx }: DecodeFramesOptions): AsyncGenerator<DecodedFrame>;
