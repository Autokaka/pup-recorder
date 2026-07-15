import { type Frame } from "node-av";
import type { HardwareContext } from "node-av/api";
export type SinkKind = "mp4" | "webm";
export interface SinkOptions {
    outFile: string;
    kind: SinkKind;
    width: number;
    height: number;
    fps: number;
    withAudio: boolean;
    disableHwCodec: boolean;
    sharedHw?: HardwareContext;
}
export declare class OutputSink implements AsyncDisposable {
    private _s;
    private _disposed;
    private constructor();
    static kindFromPath(path: string): SinkKind;
    static create(opts: SinkOptions): Promise<OutputSink>;
    private static mp4Video;
    private static webmVideo;
    private static audioFor;
    setInputRate(sampleRate: number): void;
    encodeBGRA(bgraFrame: Frame): Promise<void>;
    encodeDecodedFrame(src: Frame): Promise<void>;
    encodeAudio(pcm: Buffer): Promise<void>;
    flush(): Promise<void>;
    [Symbol.asyncDispose](): Promise<void>;
    private swEncode;
}
