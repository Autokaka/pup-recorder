// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/10.

import { existsSync } from "fs";
import { join } from "path";

const { platform, arch } = process;

const rustPath = `rust/${platform}-${arch}.node`;

const nativeSearchPaths = [
  join(__dirname, `../../${rustPath}`), // process start from src
  join(__dirname, `../${rustPath}`), // process start from dist
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
