// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/10.

import { $ } from "bun";
import { copyFile, mkdir } from "fs/promises";
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

async function copyArtifact(platform: string, arch: string, dir: string) {
  const libName = getArtifactName(platform);
  if (!libName) return;
  const src = join(dir, libName);
  const destDir = join("rust");
  const dest = join(destDir, `${platform}-${arch}.node`);
  await mkdir(destDir, { recursive: true });
  await copyFile(src, dest);
}

async function cargoBuild(platform: string, arch: string) {
  const triple = getTriple(platform, arch);
  if (triple) {
    if (platform === "win32") {
      await $`cargo xwin build --release --quiet --target ${triple}`;
    } else {
      await $`cargo zigbuild --release --quiet --target ${triple}`;
    }
    await copyArtifact(platform, arch, `target/${triple}/release`);
  }
}

const PLATFORMS = ["darwin", "linux", "win32"];
const ARCHS = ["x64", "arm64"];

async function buildRust() {
  await $`cargo install --quiet cargo-zigbuild cargo-xwin`;
  for (const platform of PLATFORMS) {
    for (const arch of ARCHS) {
      await cargoBuild(platform, arch);
    }
  }
}

buildRust();
