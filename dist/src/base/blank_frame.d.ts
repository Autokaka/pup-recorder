export declare const BLANK_WARN_RATIO = 0.5;
export declare function isBlankFrame(bgra: Buffer, width: number, height: number): boolean;
export declare class BlankFrameStats {
    private readonly _width;
    private readonly _height;
    private _total;
    private _blank;
    constructor(width: number, height: number);
    sample(frame: Buffer): void;
    finalize(): number;
}
