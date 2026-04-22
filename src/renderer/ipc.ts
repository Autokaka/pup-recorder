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

type Msg =
  | { type: IpcMsgType.PROGRESS; value: number }
  | { type: IpcMsgType.DONE; payload: IpcDonePayload }
  | { type: IpcMsgType.ERROR; error: string };

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

  private send(msg: Msg): Promise<void> {
    return new Promise((resolve) => {
      if (!process.send) return resolve();
      process.send(msg, () => resolve());
    });
  }
}

export class IpcReader extends EventEmitter<{
  progress: [value: number];
  message: [msg: Msg];
  done: [payload: IpcDonePayload];
  error: [error: Error];
  close: [];
}> {
  constructor(child: ChildProcess) {
    super();
    child.on("message", (raw) => {
      const msg = raw as Msg;
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
    child.once("exit", () => this.emit("close"));
  }
}
