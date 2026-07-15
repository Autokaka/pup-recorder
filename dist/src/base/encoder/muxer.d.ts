import { type CodecContext, type Packet, type Stream } from "node-av";
export declare class FormatMuxer {
    private readonly _ctx;
    private _opened;
    private _disposed;
    constructor(outPath: string, formatName?: string);
    addStream(codecCtx: CodecContext, codecTag?: string): Stream;
    open(): Promise<void>;
    writePacket(pkt: Packet): Promise<void>;
    [Symbol.asyncDispose](): Promise<void>;
}
