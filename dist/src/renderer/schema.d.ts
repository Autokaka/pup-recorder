import z from "zod";
export declare const DEFAULT_WIDTH = 1920;
export declare const DEFAULT_HEIGHT = 1080;
export declare const DEFAULT_FPS = 30;
export declare const DEFAULT_DURATION = 5;
export declare const DEFAULT_WINDOW_TIMEOUT = 10;
export declare const DEFAULT_OUT_FILES: string[];
export declare const renderSchema: z.ZodObject<{
    duration: z.ZodNumber;
    width: z.ZodNumber;
    height: z.ZodNumber;
    fps: z.ZodNumber;
    withAudio: z.ZodBoolean;
    outFiles: z.ZodArray<z.ZodString>;
    useInnerProxy: z.ZodBoolean;
    deterministic: z.ZodBoolean;
    disableGpu: z.ZodBoolean;
    disableHwCodec: z.ZodBoolean;
    windowTolerant: z.ZodBoolean;
    windowTimeout: z.ZodNumber;
    screenshots: z.ZodArray<z.ZodNumber>;
}, z.core.$strip>;
export type RenderOptions = z.infer<typeof renderSchema>;
export type ConsoleCallback = (level: string, message: string) => void;
export type ProgressCallback = (progress: number) => void;
export interface IPCRenderOptions extends RenderOptions {
    source: string;
    signal: AbortSignal;
    onProgress: ProgressCallback;
    onConsole: ConsoleCallback;
}
export interface RenderResult {
    options: RenderOptions;
    written: number;
    jank: number;
    outFiles: string[];
    blank: number;
    screenshots: string[];
}
export declare const defaultRenderOptions: RenderOptions;
