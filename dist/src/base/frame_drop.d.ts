export interface FrameDropScore {
    global: number;
    local: number;
    jank: number;
    expected: number;
    actual: number;
    maxBurst: number;
}
export declare class FrameDropStats {
    private readonly _fps;
    private _actual;
    private _currentBurst;
    private _bursts;
    constructor(fps: number);
    wrote(count?: number): void;
    dropped(count?: number): void;
    finalize(): FrameDropScore;
}
