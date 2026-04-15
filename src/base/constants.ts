// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/09.

import { createRequire } from "module";
import { dirname, join } from "path";
import { penv } from "./env";
import { parseNumber } from "./parser";

const require = createRequire(import.meta.url);
const env = process.env;

export const pupLogLevel = penv("PUP_LOG_LEVEL", parseNumber, 2);
export const pupUseInnerProxy = env["PUP_USE_INNER_PROXY"] === "1";
export const pupDisableGPU = env["PUP_DISABLE_GPU"] === "1";
export const pupDisableHwCodec = env["PUP_DISABLE_HW_CODEC"] === "1";
export const pupDeterministic = env["PUP_DETERMINISTIC"] === "1";

export const pupPkgRoot = dirname(require.resolve("pup-recorder/package.json"));
export const pupApp = join(pupPkgRoot, "dist", "app.cjs");
export const pupIpcSocket = env["PUP_IPC_SOCKET"];

export const pupWindowTolerant = env["PUP_WINDOW_TOLERANT"] === "1";
