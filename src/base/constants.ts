// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/09.

import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { penv } from "./env";
import { parseNumber } from "./parser";

const require = createRequire(import.meta.url);

export const pupLogLevel = penv("PUP_LOG_LEVEL", parseNumber, 2);

export const pupPkgRoot = dirname(require.resolve("pup-recorder/package.json"));
export const pupApp = join(pupPkgRoot, "dist", "app.cjs");
export const pupAudioPreload = join(pupPkgRoot, "dist", "runtime", "audio_preload.cjs");
export const pupIframePreload = join(pupPkgRoot, "dist", "runtime", "iframe_preload.cjs");
