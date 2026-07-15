import { type ConsoleCallback, type ProgressCallback, type RenderOptions, type RenderResult } from "./renderer/schema";
export interface PupOptions extends Partial<RenderOptions> {
    signal?: AbortSignal;
    onProgress?: ProgressCallback;
    onConsole?: ConsoleCallback;
}
export interface PupResult extends RenderResult {
}
export declare function pup(source: string, options: Partial<PupOptions>): Promise<PupResult>;
