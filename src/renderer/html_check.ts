// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/09.

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SUPPORTED_PROTOCOLS = ["file:", "http:", "https:", "data:"];
const SOURCE_PATTERN = /^(file:|https?:|data:)/;

export function checkHTML(source: string): void {
  if (!SOURCE_PATTERN.test(source)) {
    const protocol = `${source.split(":")[0]}:`;
    const message = SUPPORTED_PROTOCOLS.includes(protocol)
      ? `unsupported protocol: ${protocol}, expected ${SUPPORTED_PROTOCOLS.join(", ")}`
      : `invalid source format, expected ${SUPPORTED_PROTOCOLS.join(", ")}`;
    throw new Error(message);
  }

  // file: sources are cheap to stat here; Electron would only surface a missing one as did-fail-load after spawn+warmup.
  if (source.startsWith("file:") && !existsSync(fileURLToPath(source))) {
    throw new Error(`source file not found: ${source}`);
  }
}
