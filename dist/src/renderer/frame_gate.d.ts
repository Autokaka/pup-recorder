export interface CapturedFrame {
    ts: number;
    pix: Buffer;
}
export interface FrameGateOptions {
    width: number;
    height: number;
    windowMs: number;
}
export declare class FirstFrameGate {
    private readonly _opts;
    private _baseline;
    private _baselineAt;
    constructor(_opts: FrameGateOptions);
    get baseline(): CapturedFrame | undefined;
    accept(frame: CapturedFrame, now: number): CapturedFrame | undefined;
    expired(now: number): boolean;
}
