// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/10.

import { ok } from "assert";
import { randomUUID } from "crypto";
import { rmSync, writeFileSync } from "fs";
import { createRequire } from "module";
import { arch, platform, tmpdir } from "os";
import { join } from "path";
import darwinArm64 from "../../rust/darwin-arm64.bin";
import darwinX64 from "../../rust/darwin-x64.bin";
import linuxArm64 from "../../rust/linux-arm64.bin";
import linuxX64 from "../../rust/linux-x64.bin";
import win32Arm64 from "../../rust/win32-arm64.bin";
import win32X64 from "../../rust/win32-x64.bin";

const bin = new Map([
  ["darwin-arm64", darwinArm64],
  ["darwin-x64", darwinX64],
  ["linux-arm64", linuxArm64],
  ["linux-x64", linuxX64],
  ["win32-arm64", win32Arm64],
  ["win32-x64", win32X64],
]).get(`${platform()}-${arch()}`);
ok(bin instanceof Uint8Array, `Unsupported platform: ${platform()} ${arch()}`);

const path = join(tmpdir(), `pup-rust-${randomUUID()}.node`);
writeFileSync(path, bin);
const require = createRequire(import.meta.url);
const lib = require(path) as Record<string, unknown>;
rmSync(path, { force: true });

export interface FixedBufferWriter {
  new (
    path: string,
    bufferSize: number,
    queueDepth?: number,
  ): FixedBufferWriter;

  write(buffer: Buffer): void;

  close(): Promise<void>;
}

export const FixedBufferWriter = lib["FixedBufferWriter"] as FixedBufferWriter;
