// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/01.

import type { ChildProcess } from "child_process";
import { EventEmitter } from "events";

export const enum IpcMsgType {
  PROGRESS = "progress",
  DONE = "done",
  ERROR = "error",
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

export type IpcMsg = ProgressMsg | DoneMsg | ErrorMsg;

export interface IpcEvents {
  progress: [value: number];
  message: [msg: IpcMsg];
  done: [payload: IpcDonePayload];
  error: [error: Error];
  close: [code: number | null];
}

export class IpcWriter {
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
      this.emit("message", msg);
      switch (msg.type) {
        case IpcMsgType.PROGRESS:
          this.emit("progress", msg.value);
          break;
        case IpcMsgType.DONE:
          this.emit("done", msg.payload);
          break;
        case IpcMsgType.ERROR:
          this.emit("error", new Error(msg.error));
          break;
      }
    });
    child.once("exit", (c) => this.emit("close", c));
  }
}
