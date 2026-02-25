import { $ } from "bun";
import { rm } from "fs/promises";
import { createRequire } from "module";
import { join } from "path";
import { build } from "tsup";

const require = createRequire(import.meta.url);
const tsPath = require.resolve("@typescript/native-preview/package.json");
const tsgo = join(tsPath, "..", "bin", "tsgo.js");

await $`${tsgo}`;
await rm("dist", { recursive: true, force: true });

$`bun build_rust.ts`;

const common = {
  silent: true,
  splitting: false,
  target: "node20",
  sourcemap: true,
  external: ["electron", "commander"],
  shims: true,
};

build({
  ...common,
  entry: ["src/index.ts", "src/cli.ts"],
  format: "esm",
  outDir: "dist",
  dts: true,
});

build({
  ...common,
  entry: ["src/index.ts", "src/cli.ts", "src/app.ts"],
  format: "cjs",
  outDir: "dist/cjs",
});
