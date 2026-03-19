// Created by Autokaka (qq1909698494@gmail.com) on 2026/03/14.

import { ok } from "assert";
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

const tmpFile = join(tmpdir(), `pup-native-${key}.node`);
writeFileSync(tmpFile, nodeData);
const require = createRequire(import.meta.url);
const lib = require(tmpFile) as Record<string, unknown>;
rmSync(tmpFile, { force: true });

export interface BgraConverter {
  new (width: number, height: number): BgraConverter;

  convert(bgra: Buffer): Promise<Buffer>;
}

export const BgraConverter = lib["BgraConverter"] as BgraConverter;
