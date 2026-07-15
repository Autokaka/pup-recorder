import { type Frame } from "node-av";
import type { HardwareContext } from "node-av/api";
import type { FormatMuxer } from "./muxer";
export interface HwVideoEncoderOptions {
    width: number;
    height: number;
    fps: number;
    hw: HardwareContext;
    bitrate: number;
    muxer: FormatMuxer;
}
export declare class VideoToolboxEncoder implements Disposable {
    private _ctx;
    private _pkt;
    private _stream;
    private _pts;
    private constructor();
    static create(opts: HwVideoEncoderOptions): Promise<VideoToolboxEncoder>;
    encode(bgraFrame: Frame, muxer: FormatMuxer): Promise<void>;
    flush(muxer: FormatMuxer): Promise<void>;
    [Symbol.dispose](): void;
    private drain;
}
