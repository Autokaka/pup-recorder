// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/09.

import { existsSync } from "fs";
import { resolve } from "path";
import { penv } from "./env";
import { parseNumber } from "./parser";

const pupAppSearchPaths = [
  resolve(__dirname, "cjs/app.cjs"), // process from dist
  resolve(__dirname, "app.cjs"), // process from dist/cjs
  resolve(__dirname, "../../cjs/app.cjs"), // process from src
];
export const pupAppPath = pupAppSearchPaths.find(existsSync)!;

const env = process.env;
export const pupLogLevel = penv("PUP_LOG_LEVEL", parseNumber, 2);
export const pupUseInnerProxy = env["PUP_USE_INNER_PROXY"] === "1";
export const pupFFmpegPath = env["FFMPEG_BIN"] ?? `ffmpeg`;
