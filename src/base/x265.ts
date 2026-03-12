// Created by Autokaka (qq1909698494@gmail.com) on 2026/03/12.

import { ok } from "assert";
import { randomUUID } from "crypto";
import { copyFileSync, rmSync, writeFileSync } from "fs";
import { arch, platform, tmpdir } from "os";
import { join } from "path";
import darwinArm64 from "../../x265/darwin-arm64.bin";
import darwinX64 from "../../x265/darwin-x64.bin";
import linuxArm64 from "../../x265/linux-arm64.bin";
import linuxX64 from "../../x265/linux-x64.bin";
import win32Arm64 from "../../x265/win32-arm64.bin";
import win32X64 from "../../x265/win32-x64.bin";
import { pupNoCleanup } from "./constants";

const bin = new Map([
  ["darwin-arm64", darwinArm64],
  ["darwin-x64", darwinX64],
  ["linux-arm64", linuxArm64],
  ["linux-x64", linuxX64],
  ["win32-arm64", win32Arm64],
  ["win32-x64", win32X64],
]).get(`${platform()}-${arch()}`);
ok(bin, `Unsupported platform: ${platform()} ${arch()}`);

export function mountX265() {
  const path = join(tmpdir(), `pup-x265-${randomUUID()}.exe`);
  if (typeof bin === "string") {
    copyFileSync(bin, path);
  } else {
    ok(bin instanceof Uint8Array, "Invalid x265 binary");
    writeFileSync(path, bin, { mode: 0o755 });
  }
  return path;
}

export function unmountX265(path: string) {
  !pupNoCleanup && rmSync(path, { force: true });
}
