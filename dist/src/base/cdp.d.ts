import type { Debugger, Size, WebContents } from "electron";
export declare function send(cdp: Debugger, method: string, params?: object): Promise<unknown>;
export declare function evalIn(cdp: Debugger, expression: string): Promise<unknown>;
export declare function advanceVirtualTime(cdp: Debugger, budget: number): Promise<void>;
export declare function pauseVirtualTime(cdp: Debugger): Promise<void>;
export declare function rebuildDrawable(web: WebContents, size: Size): Promise<void>;
