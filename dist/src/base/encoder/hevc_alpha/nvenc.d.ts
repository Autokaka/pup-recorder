import { type Frame } from "node-av";
import type { FormatMuxer } from "../muxer";
import type { HwVideoEncoderOptions } from "../videotoolbox";
export declare class NvencDualLayerEncoder implements Disposable {
    private _s;
    private _mux;
    private _pts;
    private constructor();
    static create(opts: HwVideoEncoderOptions): Promise<NvencDualLayerEncoder>;
    encode(bgraFrame: Frame, muxer: FormatMuxer): Promise<void>;
    flush(muxer: FormatMuxer): Promise<void>;
    [Symbol.dispose](): void;
    private sendEof;
}
