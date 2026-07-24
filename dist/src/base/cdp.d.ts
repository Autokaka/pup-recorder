import type { Debugger, Size } from "electron";
export declare function send(cdp: Debugger, method: string, params?: object): Promise<unknown>;
export declare function evalIn(cdp: Debugger, expression: string): Promise<unknown>;
export declare function advanceVirtualTime(cdp: Debugger, budget: number): Promise<void>;
export declare function pauseVirtualTime(cdp: Debugger): Promise<void>;
export declare function resizeDrawable(cdp: Debugger, size: Size): Promise<void>;
export declare function rebuildDrawable(cdp: Debugger, size: Size): Promise<void>;
