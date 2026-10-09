/*
 * Created by Lu Ao (luao@bilibili.com) on 2026/10/09.
 * Copyright © 2026 bilibili. All rights reserved.
 */

import { URL } from "node:url";

const map = new Map([
  [`jssz-boss.hdslb.com`, `jssz-boss.bilibili.co`],
  [`boss.hdslb.com`, `shjd-boss.bilibili.co`],
  [`upos-sz-mirrorcos.bilivideo.com`, `jssz-inner-boss.bilibili.co`],
  ["upos-sz-staticcos.bilivideo.com", "upos-sz-office.bilibili.co"],
]);

const targets = new Set(map.values());

export function isProxyTarget(url: string): boolean {
  return url.startsWith("http") && targets.has(new URL(url).hostname);
}

export function proxiedUrl(url: string) {
  if (!url.startsWith("http")) {
    return url;
  }
  const parsed = new URL(url);
  const target = map.get(parsed.hostname);
  if (!target) {
    return url;
  }
  parsed.hostname = target;
  parsed.protocol = "http:";
  return parsed.toString();
}
