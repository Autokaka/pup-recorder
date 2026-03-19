// Created by Autokaka (qq1909698494@gmail.com) on 2026/03/14.

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

export interface BgraConverter {
  new (width: number, height: number): BgraConverter;

  convert(bgra: Buffer): Promise<Buffer>;
}

export const BgraConverter = lib["BgraConverter"] as BgraConverter;
