// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/01.

import type { ChildProcess } from "child_process";
import { EventEmitter } from "events";

export const enum IpcMsgType {
  // child → parent
  CONSOLE = "console",
  PROGRESS = "progress",
  DONE = "done",
  ERROR = "error",
  // parent → child
  CANCEL = "cancel",
}

export interface ConsoleMsg {
  type: IpcMsgType.CONSOLE;
  level: string;
  message: string;
}

export interface CancelMsg {
  type: IpcMsgType.CANCEL;
  reason?: string;
}

export interface IpcDonePayload {
  written: number;
  jank: number;
  outFile: string;
}

export interface ProgressMsg {
  type: IpcMsgType.PROGRESS;
  value: number;
}

export interface DoneMsg {
  type: IpcMsgType.DONE;
  payload: IpcDonePayload;
}

export interface ErrorMsg {
  type: IpcMsgType.ERROR;
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
    this.send({ type: IpcMsgType.CONSOLE, level, message });
  }

  writeProgress(value: number): void {
    this.send({ type: IpcMsgType.PROGRESS, value });
  }

  writeError(error: string): Promise<void> {
    return this.send({ type: IpcMsgType.ERROR, error });
  }

  writeDone(payload: IpcDonePayload): Promise<void> {
    return this.send({ type: IpcMsgType.DONE, payload });
  }

  private send(msg: IpcMsg): Promise<void> {
    return new Promise((resolve) => {
      if (!process.send) return resolve();
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
        case IpcMsgType.CONSOLE: {
          this.emit("console", msg.level, msg.message);
          break;
        }
        case IpcMsgType.PROGRESS: {
          this.emit("progress", msg.value);
          break;
        }
        case IpcMsgType.DONE: {
          this.emit("done", msg.payload);
          break;
        }
        case IpcMsgType.ERROR: {
          this.emit("error", new Error(msg.error));
          break;
        }
      }
    });
    child.once("exit", (c) => this.emit("close", c));
  }
}
