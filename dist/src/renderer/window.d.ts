import { BrowserWindow } from "electron";
import type { IPCRenderOptions } from "./schema";
export declare function disposeWindow(win: BrowserWindow): Promise<void>;
export type WindowCreatedCallback = (window: BrowserWindow) => void | Promise<void>;
export interface WindowOptions {
    source: string;
    renderer: IPCRenderOptions;
    tolerant?: boolean;
    onCreated?: WindowCreatedCallback;
    signal?: AbortSignal;
}
export declare function loadWindow({ source, renderer, onCreated, signal }: WindowOptions): Promise<BrowserWindow>;
