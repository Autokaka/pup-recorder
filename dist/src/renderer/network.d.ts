import type { BrowserWindow } from "electron";
export interface NetworkOptions {
    source: string;
    window: BrowserWindow;
    useInnerProxy?: boolean;
    stubMedia?: boolean;
}
export declare function setInterceptor({ source, window, useInnerProxy, stubMedia }: NetworkOptions): void;
export declare function unsetInterceptor(window: BrowserWindow): void;
