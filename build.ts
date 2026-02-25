// Created by Autokaka (qq1909698494@gmail.com) on 2026/01/30.

import { $ } from "bun";
import { build } from "esbuild";
import { mkdir, rm } from "fs/promises";
import { createRequire } from "module";
import { join } from "path";

const require = createRequire(import.meta.url);
const tsPath = require.resolve("@typescript/native-preview/package.json");
const dtsbPath = require.resolve("dts-bundle-generator");

const tsgo = join(tsPath, "..", "bin", "tsgo.js");
const dtsb = join(dtsbPath, "..", "bin", "dts-bundle-generator.js");

const common = {
  platform: "node",
  packages: "external",
  bundle: true,
  sourcemap: true,
} as const;

try {
  await $`${tsgo}`;

  await rm("dist", { recursive: true, force: true });
  await mkdir("dist", { recursive: true });

  await Promise.all([
    // library tsd
    $`${dtsb} --silent -o dist/index.d.ts src/index.ts`,
    build({
      ...common,
      entryPoints: [
        "src/index.ts", // library
        "src/cli.ts", // cli
      ],
      format: "esm",
      outdir: "dist",
    }),
    build({
      ...common,
      entryPoints: [
        "src/index.ts", // library
        "src/cli.ts", // cli
        "src/app.ts", // electron app
      ],
      format: "cjs",
      outdir: "dist/cjs",
      outExtension: { ".js": ".cjs" },
    }),
  ]);
} catch {
  process.exit(1);
}
