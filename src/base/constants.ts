// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/09.

import { createRequire } from "module";
import { dirname, join } from "path";
import { penv } from "./env";
import { parseNumber } from "./parser";

const require = createRequire(import.meta.url);

export const pupLogLevel = penv("PUP_LOG_LEVEL", parseNumber, 2);

export const pupPkgRoot = dirname(require.resolve("pup-recorder/package.json"));
export const pupApp = join(pupPkgRoot, "dist", "app.cjs");
export const pupAudioPreload = join(pupPkgRoot, "dist", "audio_preload.cjs");
