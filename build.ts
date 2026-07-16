import { $ } from "bun";
import { rm } from "fs/promises";
import { createRequire } from "module";
import { join } from "path";
import { build, type Options } from "tsup";
import { dependencies } from "./package.json";

const require = createRequire(import.meta.url);
const tsPath = require.resolve("typescript/package.json");
const tsc = join(tsPath, "..", require(tsPath).bin.tsc);
const biomePath = require.resolve("@biomejs/biome/package.json");
const biome = join(biomePath, "..", "bin", "biome");

await $`${biome} check --write --error-on-warnings`;
await rm("dist", { recursive: true, force: true });
// tsup's dts path needs the pre-TS7 compiler API; tsc typechecks and emits the declarations in one pass.
await $`${tsc}`;

const common: Options = {
  silent: true,
  target: "node20",
  shims: true,
  external: Object.keys(dependencies),
  sourcemap: "inline",
  minify: true,
  treeshake: true,
  banner: { js: `import "source-map-support/register.js";` },
};

await build({
  ...common,
  entry: [
    "src/index.ts", //
    "src/cli.ts",
  ],
  format: "esm",
  outDir: "dist",
});

await build({
  ...common,
  entry: [
    "src/app.ts", //
    "src/runtime/audio_preload.ts",
    "src/runtime/render_preload.ts",
    "src/runtime/shoot_preload.ts",
  ],
  format: "cjs",
  outDir: "dist",
});
