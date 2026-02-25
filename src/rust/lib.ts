// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/10.

import { existsSync } from "fs";
import { join } from "path";
import { basedir } from "../base/basedir";

const { platform, arch } = process;

const rustPath = `rust/${platform}-${arch}.node`;

const nativeSearchPaths = [
  join(basedir, `../../${rustPath}`), // process start from src
  join(basedir, `../${rustPath}`), // process start from dist
];
const mod = require(nativeSearchPaths.find(existsSync)!);

export interface FixedBufferWriter {
  new (
    path: string,
    bufferSize: number,
    queueDepth?: number,
  ): FixedBufferWriter;

  write(buffer: Buffer): void;

  close(): Promise<void>;
}

export const FixedBufferWriter = mod.FixedBufferWriter as FixedBufferWriter;
