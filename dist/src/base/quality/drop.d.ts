export declare const JANK_WARN_SCORE = 0.25;
export interface DropScore {
    global: number;
    local: number;
    jank: number;
    expected: number;
    actual: number;
    maxBurst: number;
}
export declare class DropStats {
    private readonly _fps;
    private _actual;
    private _currentBurst;
    private _bursts;
    constructor(fps: number);
    wrote(count?: number): void;
    dropped(count?: number): void;
    finalize(): DropScore;
}
