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
  return null;
}

async function copyArtifact(platform: string, arch: string, dir: string) {
  const ext = platform === "darwin" ? "dylib" : "so";
  const libName = `libnative.${ext}`;
  const src = join(dir, libName);
  const destDir = join("rust");
  const dest = join(destDir, `${platform}-${arch}.node`);
  await mkdir(destDir, { recursive: true });
  await copyFile(src, dest);
}

async function build(platform: string, arch: string) {
  const triple = getTriple(platform, arch);
  if (triple) {
    await $`rustup target add ${triple}`;
    await $`cargo zigbuild --release --target ${triple}`;
    await copyArtifact(platform, arch, `target/${triple}/release`);
  }
}

async function buildRust() {
  const platforms = ["darwin", "linux"];
  const archs = ["x64", "arm64"];

  await $`cargo install cargo-zigbuild`;

  for (const platform of platforms) {
    for (const arch of archs) {
      await build(platform, arch);
    }
  }
}

buildRust();
