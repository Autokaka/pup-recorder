export interface VideoMeta {
    id: string;
    /** Intrinsic source dimensions (reported as videoWidth/videoHeight). */
    width: number;
    height: number;
    /** Decoded+scaled frame dimensions actually served (≤ source; capped to the display box). */
    frameWidth: number;
    frameHeight: number;
    fps: number;
    duration: number;
    /** Seconds of corrupt/empty leading content held on the first decodable frame. */
    leadGap: number;
}
export interface OpenOptions {
    src: string;
    fps: number;
    /** Display-box pixels (canvas backing store); decode is downscaled to cover this, never upscaled. */
    dstW?: number;
    dstH?: number;
    /** objectFit; "none" needs 1:1 native pixels so it skips downscale. */
    fit?: string;
}
export declare class FrameServer {
    private readonly _useInnerProxy;
    private _sessions;
    private _probes;
    private _stubs;
    private _closed;
    constructor(_useInnerProxy: boolean);
    open(opts: OpenOptions): Promise<VideoMeta>;
    stub(src: string): Promise<Buffer>;
    getFrame(id: string, idx: number): Promise<Buffer>;
    close(id: string): Promise<void>;
    private probeCached;
    closeAll(): Promise<void>;
}
