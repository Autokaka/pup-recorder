// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/01.

import type { ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";

export enum IpcMsgType {
  // child → parent
  Console = "console",
  Progress = "progress",
  Done = "done",
  Error = "error",
  // parent → child
  Cancel = "cancel",
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
  outFiles: string[];
  blank: number;
  jank: number;
  screenshots: string[];
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

export class IpcWriter {
  writeConsole(level: string, message: string) {
    this.send({ type: IpcMsgType.Console, level, message });
  }

  writeProgress(value: number): void {
    this.send({ type: IpcMsgType.Progress, value });
  }

  writeError(error: string): Promise<void> {
    return this.send({ type: IpcMsgType.Error, error });
  }

  writeDone(payload: IpcDonePayload): Promise<void> {
    return this.send({ type: IpcMsgType.Done, payload });
  }

  private send(msg: IpcMsg): Promise<void> {
    return new Promise((resolve) => {
      if (!process.send) {
        return resolve();
      }
      process.send(msg, () => resolve());
    });
  }
}

export class IpcReader extends EventEmitter<IpcEvents> {
  constructor(child: ChildProcess) {
    super();
    child.on("message", (raw) => {
      const msg = raw as IpcMsg;
      switch (msg.type) {
        case IpcMsgType.Console: {
          this.emit("console", msg.level, msg.message);
          break;
        }
        case IpcMsgType.Progress: {
          this.emit("progress", msg.value);
          break;
        }
        case IpcMsgType.Done: {
          this.emit("done", msg.payload);
          break;
        }
        case IpcMsgType.Error: {
          this.emit("error", new Error(msg.error));
          break;
        }
      }
    });
    child.once("exit", (c) => this.emit("close", c));
  }
}
