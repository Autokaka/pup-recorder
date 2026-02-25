/*
 * Created by Lu Ao (luao@bilibili.com) on 2026/02/25.
 * Copyright © 2026 bilibili. All rights reserved.
 */

const SUPPORTED_PROTOCOLS = ["file:", "http:", "https:", "data:"];
const SOURCE_PATTERN = /^(file:|https?:|data:)/;

export function checkHTML(source: string): void {
  if (SOURCE_PATTERN.test(source)) {
    return;
  }

  const protocol = source.split(":")[0] + ":";
  const message = SUPPORTED_PROTOCOLS.includes(protocol)
    ? `unsupported protocol: ${protocol}, expected ${SUPPORTED_PROTOCOLS.join(", ")}`
    : `invalid source format, expected ${SUPPORTED_PROTOCOLS.join(", ")}`;

  throw new Error(message);
}
