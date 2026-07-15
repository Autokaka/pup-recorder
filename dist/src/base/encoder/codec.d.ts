import { CodecContext, type Frame, type Packet, SoftwareScaleContext } from "node-av";
export declare class CodecState implements Disposable {
    readonly src: Frame;
    readonly dst: Frame;
    readonly pkt: Packet;
    private _sws?;
    private _png?;
    static create(width: number, height: number): Promise<CodecState>;
    private constructor();
    /**
     * Create a fresh PNG decoder context.
     * The FFmpeg PNG decoder accumulates APNG blending state
     * across frames, so a shared instance corrupts output when decoding standalone PNGs.
     */
    png(): Promise<CodecContext>;
    decodePNG(pngData: Buffer): Promise<Frame>;
    get sws(): SoftwareScaleContext;
    [Symbol.dispose](): void;
}
