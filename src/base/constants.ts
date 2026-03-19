// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/09.

import { penv } from "./env";
import { parseNumber } from "./parser";

const env = process.env;
export const pupLogLevel = penv("PUP_LOG_LEVEL", parseNumber, 2);
export const pupUseInnerProxy = env["PUP_USE_INNER_PROXY"] === "1";
export const pupDisableGPU = env["PUP_DISABLE_GPU"] === "1";
