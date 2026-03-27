import { $ } from "bun";
import { rm } from "fs/promises";
import { createRequire } from "module";
import { join } from "path";
import { build, type Options } from "tsup";
import { buildRust } from "./build_rust";
import { dependencies } from "./package.json";

const require = createRequire(import.meta.url);
const tsPath = require.resolve("@typescript/native-preview/package.json");
const tsgo = join(tsPath, "..", "bin", "tsgo.js");

await buildRust();

await $`${tsgo}`;
await rm("dist", { recursive: true, force: true });

const common: Options = {
  silent: true,
  target: "node20",
  shims: true,
  external: Object.keys(dependencies),
  sourcemap: "inline",
  minify: true,
  treeshake: true,
  banner: { js: `import "source-map-support/register.js";` },
  loader: { ".zip": "binary" },
};

await build({
  ...common,
  entry: ["src/index.ts", "src/cli.ts"],
  format: "esm",
  outDir: "dist",
  experimentalDts: true,
});

await build({
  ...common,
  entry: ["src/app.ts"],
  format: "cjs",
  outDir: "dist",
});
