// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/10.

import { $ } from "bun";
import { zipSync } from "fflate";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

function getTriple(platform: string, arch: string) {
  if (platform === "darwin") {
    if (arch === "x64") return "x86_64-apple-darwin";
    if (arch === "arm64") return "aarch64-apple-darwin";
  }
  if (platform === "linux") {
    if (arch === "x64") return "x86_64-unknown-linux-gnu";
    if (arch === "arm64") return "aarch64-unknown-linux-gnu";
  }
  if (platform === "win32") {
    if (arch === "x64") return "x86_64-pc-windows-msvc";
    if (arch === "arm64") return "aarch64-pc-windows-msvc";
  }
  return null;
}

function getArtifactName(platform: string) {
  if (platform === "darwin") return "libnative.dylib";
  if (platform === "linux") return "libnative.so";
  if (platform === "win32") return "native.dll";
  return null;
}

const PLATFORMS = ["darwin", "linux", "win32"];
const ARCHS = ["x64", "arm64"];
const RUST_DIR = "rust";

async function cargoBuild(platform: string, arch: string): Promise<[string, Uint8Array] | undefined> {
  const triple = getTriple(platform, arch);
  const libName = getArtifactName(platform);
  if (!triple || !libName) return;

  if (platform === "win32") {
    await $`cargo xwin build --release --quiet --target ${triple}`;
  } else {
    await $`cargo zigbuild --release --quiet --target ${triple}`;
  }

  const data = await readFile(join(`target/${triple}/release`, libName));
  return [`${platform}-${arch}.node`, new Uint8Array(data)];
}

export async function buildRust() {
  await $`cargo install --quiet cargo-zigbuild cargo-xwin`;

  const entries: [string, Uint8Array][] = [];
  for (const platform of PLATFORMS) {
    for (const arch of ARCHS) {
      const entry = await cargoBuild(platform, arch);
      if (entry) entries.push(entry);
    }
  }

  await mkdir(RUST_DIR, { recursive: true });

  const zip = zipSync(Object.fromEntries(entries));
  await writeFile(join(RUST_DIR, "native.zip"), zip);
  await writeFile(join(RUST_DIR, "native.zip.d.ts"), `declare const data: Uint8Array;\nexport default data;\n`);
}
