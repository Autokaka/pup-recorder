import { $ } from "bun";
import { rm } from "fs/promises";
import { createRequire } from "module";
import { join } from "path";
import { build } from "tsup";

const require = createRequire(import.meta.url);
const tsPath = require.resolve("@typescript/native-preview/package.json");
const tsgo = join(tsPath, "..", "bin", "tsgo.js");

await $`${tsgo}`;

await Promise.all([
  rm("dist", { recursive: true, force: true }),
  rm(".opencode/plugins", { recursive: true, force: true }),
]);

const common = {
  silent: true,
  splitting: false,
  target: "node20",
  sourcemap: true,
  shims: true,
  external: [
    "electron",
    "commander",
    "@modelcontextprotocol/sdk",
    "@opencode-ai/plugin",
    "zod",
  ],
};

await Promise.all([
  build({
    ...common,
    entry: [
      "src/index.ts", //
      "src/cli.ts",
      "src/mcp_server.ts",
    ],
    format: "esm",
    outDir: "dist",
    dts: true,
  }),
  build({
    ...common,
    entry: [
      "src/index.ts", //
      "src/cli.ts",
      "src/mcp_server.ts",
      "src/app.ts",
    ],
    format: "cjs",
    outDir: "dist/cjs",
  }),
]);
