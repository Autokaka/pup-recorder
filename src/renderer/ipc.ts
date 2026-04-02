// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/01.

import { EventEmitter } from "events";
import { createConnection, createServer, type Socket } from "net";

const HEADER_SIZE = 8;

export const enum IpcMsgType {
  PROGRESS = 1,
  DONE = 2,
  ERROR = 3,
}

export interface IpcDonePayload {
  written: number;
  jank: number;
  outFile: string;
}

export class IpcWriter {
  constructor(private readonly _socket: Socket) {}

  writeProgress(value: number): void {
    this.write(IpcMsgType.PROGRESS, Buffer.from(`${value}`));
  }

  writeError(error: string) {
    this.write(IpcMsgType.ERROR, Buffer.from(error));
    this._socket.end();
  }

  writeDone(payload: IpcDonePayload): void {
    this.write(IpcMsgType.DONE, Buffer.from(JSON.stringify(payload)));
    this._socket.end();
  }

  private write(type: IpcMsgType, payload: Buffer): void {
    const header = Buffer.alloc(HEADER_SIZE);
    header.writeUInt32LE(type, 0);
    header.writeUInt32LE(payload.byteLength, 4);
    this._socket.write(header);
    this._socket.write(payload);
  }
}

export function connectIpc(socketPath: string): Promise<IpcWriter> {
  return new Promise((resolve, reject) => {
    const socket = createConnection(socketPath);
    socket.once("connect", () => resolve(new IpcWriter(socket)));
    socket.once("error", reject);
  });
}

export class IpcReader extends EventEmitter<{
  progress: [value: number];
  message: [type: IpcMsgType, buffer: Buffer];
  done: [payload: IpcDonePayload];
  error: [error: Error];
  close: [];
}> {
  private _chunks: Buffer[] = [];
  private _buffered = 0;

  constructor(private readonly _socket: Socket) {
    super();
    this._socket.on("data", (data) => this.onData(data));
    this._socket.on("error", (err) => this.emit("error", err));
    this._socket.on("close", () => this.emit("close"));
  }

  private onData(data: Buffer): void {
    this._chunks.push(data);
    this._buffered += data.byteLength;
    this.flush();
  }

  private flush(): void {
    for (;;) {
      if (this._buffered < HEADER_SIZE) return;
      const header = this.peek(HEADER_SIZE);
      const type = header.readUInt32LE(0) as IpcMsgType;
      const len = header.readUInt32LE(4);
      if (this._buffered < HEADER_SIZE + len) return;
      this.consume(HEADER_SIZE);
      const payload = this.consume(len);
      this.emit("message", type, payload);
      switch (type) {
        case IpcMsgType.PROGRESS: {
          this.emit("progress", Number(payload.toString()));
          break;
        }
        case IpcMsgType.DONE: {
          this.emit("done", JSON.parse(payload.toString()));
          break;
        }
        case IpcMsgType.ERROR: {
          this.emit("error", new Error(payload.toString()));
          break;
        }
      }
    }
  }

  private peek(n: number): Buffer {
    if (this._chunks[0] && this._chunks[0].byteLength >= n) return this._chunks[0];
    return Buffer.concat(this._chunks).subarray(0, n);
  }

  private consume(n: number): Buffer {
    const out = Buffer.allocUnsafe(n);
    let offset = 0;
    while (offset < n) {
      const chunk = this._chunks[0]!;
      const take = Math.min(chunk.byteLength, n - offset);
      chunk.copy(out, offset, 0, take);
      if (take === chunk.byteLength) {
        this._chunks.shift();
      } else {
        this._chunks[0] = chunk.subarray(take);
      }
      offset += take;
    }
    this._buffered -= n;
    return out;
  }
}

export interface IpcServer {
  waitForConnection(): Promise<IpcReader>;
  close(): void;
}

export function createIpcServer(socketPath: string): Promise<IpcServer> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(socketPath, () => {
      resolve({
        waitForConnection() {
          return new Promise<IpcReader>((ok, no) => {
            server.once("connection", (socket) => ok(new IpcReader(socket)));
            server.once("error", no);
          });
        },
        close() {
          server.close();
        },
      });
    });
  });
}
