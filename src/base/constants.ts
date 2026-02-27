// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/09.

import { existsSync } from "fs";
import { join } from "path";
import { basedir } from "./basedir";
import { penv } from "./env";
import { parseNumber } from "./parser";

const pupAppSearchPaths = [
  join(basedir, "cjs/app.cjs"), // process from dist
  join(basedir, "app.cjs"), // process from dist/cjs
  join(basedir, "../../cjs/app.cjs"), // process from src
];
export const pupAppPath = pupAppSearchPaths.find(existsSync)!;

const env = process.env;
export const pupLogLevel = penv("PUP_LOG_LEVEL", parseNumber, 2);
export const pupUseInnerProxy = env["PUP_USE_INNER_PROXY"] === "1";
export const pupFFmpegPath = env["FFMPEG_BIN"] ?? `ffmpeg`;
export const pupDisableGPU = env["PUP_DISABLE_GPU"] === "1";
