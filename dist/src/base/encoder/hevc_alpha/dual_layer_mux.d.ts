import { type CodecContext, type Packet, type Stream } from "node-av";
import type { FormatMuxer } from "../muxer";
import type { NvencHevcConfig } from "./parser";
export interface DualLayerMuxOptions {
    baseCtx: CodecContext;
    alphaCtx: CodecContext;
    basePkt: Packet;
    alphaPkt: Packet;
    stream: Stream;
    hevcCfg: NvencHevcConfig;
}
export declare class DualLayerMux {
    private _s;
    private _baseQueue;
    private _alphaQueue;
    constructor(s: DualLayerMuxOptions);
    drain(muxer: FormatMuxer): Promise<void>;
    desyncAfterEof(): string | undefined;
    private receiveAll;
    private snapshot;
    private writePair;
}
