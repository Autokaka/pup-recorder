export interface ScreenshotOptions {
    marks: number[];
    width: number;
    height: number;
    outFiles: string[];
}
export declare class ScreenshotTaker {
    private readonly _s;
    private readonly _pending;
    private readonly _done;
    private readonly _writes;
    constructor(_s: ScreenshotOptions);
    capture(currentTimeMs: number, bgra: Buffer): void;
    finish(finalBgra?: Buffer): Promise<string[]>;
    private take;
}
