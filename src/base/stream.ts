// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/09.

import type { ChildProcess } from "child_process";

export interface StreamWriter {
  write(buffer: Buffer): Promise<void>;
  end(): void;
}

export function createWriter(stdin: NodeJS.WritableStream): StreamWriter {
  const drainPromise = new Map<NodeJS.WritableStream, Promise<void>>();

  const waitDrain = (stream: NodeJS.WritableStream) => {
    const existing = drainPromise.get(stream);
    if (existing) return existing;
    const promise = new Promise<void>((resolve, reject) => {
      const cleanup = (fn: () => void) => {
        stream.off("drain", onDrain);
        stream.off("error", onError);
        stream.off("close", onClose);
        drainPromise.delete(stream);
        fn();
      };
      const onDrain = () => cleanup(resolve);
      const onError = (err: Error) => cleanup(() => reject(err));
      const onClose = () => cleanup(() => reject(new Error("stream closed")));
      stream.on("drain", onDrain);
      stream.on("error", onError);
      stream.on("close", onClose);
    });
    drainPromise.set(stream, promise);
    return promise;
  };

  const destroyed = () => Reflect.get(stdin, "destroyed");
  return {
    async write(buffer: Buffer) {
      if (destroyed()) {
        throw new Error("stdin destroyed");
      }
      if (!stdin.write(buffer)) {
        await waitDrain(stdin);
      }
    },
    end: () => {
      if (!destroyed()) stdin.end();
    },
  };
}

export function pipeline(...procs: ChildProcess[]) {
  for (let i = 0; i < procs.length - 1; i++) {
    const src = procs[i];
    const dst = procs[i + 1];
    if (!src?.stdout || !dst?.stdin) throw new Error("pipeline broken");
    src.stdout.pipe(dst.stdin);
  }
}

export function waitAll(...procs: ChildProcess[]) {
  return Promise.all(
    procs.map(
      (proc) =>
        new Promise<void>((resolve, reject) => {
          proc.on("error", reject);
          proc.on("close", (code) =>
            code === 0
              ? resolve()
              : reject(new Error(`exit ${code ?? "null"}`)),
          );
        }),
    ),
  );
}
