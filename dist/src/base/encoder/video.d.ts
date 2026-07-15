import { type Frame } from "node-av";
import type { AVPixelFormat, FFVideoEncoder } from "node-av/constants";
import type { FormatMuxer } from "./muxer";
export interface VideoEncoderOptions {
    width: number;
    height: number;
    fps: number;
    codecName: FFVideoEncoder;
    codecTag?: string;
    codecOpts: Record<string, string>;
    bitrate: number;
    pixelFormat: AVPixelFormat;
    muxer: FormatMuxer;
}
export declare class VideoEncoder implements Disposable {
    private readonly _ctx;
    private readonly _pkt;
    private readonly _stream;
    private _pts;
    private constructor();
    static create(opts: VideoEncoderOptions): Promise<VideoEncoder>;
    encode(frame: Frame, muxer: FormatMuxer): Promise<void>;
    flush(muxer: FormatMuxer): Promise<void>;
    [Symbol.dispose](): void;
    private drain;
}
