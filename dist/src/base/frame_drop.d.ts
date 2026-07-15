/**
 * Frame drop quality score (0 = perfect, 1 = worst).
 *
 * Combines two dimensions:
 * - Global: overall drop rate across the timeline
 * - Local: perceptual severity of consecutive drops (bursts)
 *
 * Uses complementary multiplication: score = 1 - (1-g)(1-l)
 */
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
    /** Call when a frame is actually written to the encoder. */
    wrote(count?: number): void;
    /** Call when a frame is dropped. */
    dropped(count?: number): void;
    /** Finalize and return the score. */
    finalize(): FrameDropScore;
}
