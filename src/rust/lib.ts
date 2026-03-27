// Created by Autokaka (qq1909698494@gmail.com) on 2026/03/14.

import { ok } from "assert";
import { randomUUID } from "crypto";
import { unzipSync } from "fflate";
import { rmSync, writeFileSync } from "fs";
import { createRequire } from "module";
import { arch, platform, tmpdir } from "os";
import { join } from "path";
import nativeZip from "../../rust/native.zip";

const key = `${platform()}-${arch()}`;
const files = unzipSync(nativeZip);
const nodeData = files[`${key}.node`];
ok(nodeData instanceof Uint8Array, `Unsupported platform: ${key}`);

const tmpFile = join(tmpdir(), `pup-native-${randomUUID()}.node`);
writeFileSync(tmpFile, nodeData);
const require = createRequire(import.meta.url);
const lib = require(tmpFile) as Record<string, unknown>;
rmSync(tmpFile, { force: true });

export interface FixedBufferWriter {
  new (path: string, bufferSize: number, queueDepth?: number): FixedBufferWriter;
  write(buffer: Buffer): void;
  close(): Promise<void>;
}

export const FixedBufferWriter = lib["FixedBufferWriter"] as FixedBufferWriter;
