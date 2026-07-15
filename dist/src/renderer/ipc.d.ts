import type { ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
export declare enum IpcMsgType {
    Console = "console",
    Progress = "progress",
    Done = "done",
    Error = "error",
    Cancel = "cancel"
}
export interface ConsoleMsg {
    type: IpcMsgType.Console;
    level: string;
    message: string;
}
export interface CancelMsg {
    type: IpcMsgType.Cancel;
    reason?: string;
}
export interface IpcDonePayload {
    written: number;
    jank: number;
    outFile: string;
    blank: number;
}
export interface ProgressMsg {
    type: IpcMsgType.Progress;
    value: number;
}
export interface DoneMsg {
    type: IpcMsgType.Done;
    payload: IpcDonePayload;
}
export interface ErrorMsg {
    type: IpcMsgType.Error;
    error: string;
}
export type IpcMsg = ConsoleMsg | ProgressMsg | DoneMsg | ErrorMsg | CancelMsg;
export interface IpcEvents {
    progress: [value: number];
    console: [level: string, msg: string];
    done: [payload: IpcDonePayload];
    error: [error: Error];
    close: [code: number | null];
}
export declare class IpcWriter {
    writeConsole(level: string, message: string): void;
    writeProgress(value: number): void;
    writeError(error: string): Promise<void>;
    writeDone(payload: IpcDonePayload): Promise<void>;
    private send;
}
export declare class IpcReader extends EventEmitter<IpcEvents> {
    constructor(child: ChildProcess);
}
