// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/09.

import { session } from "electron";
import { URL } from "url";
import { logger } from "./logging";

const TAG = "[Proxy]";

const map = new Map([
  [`jssz-boss.hdslb.com`, `jssz-boss.bilibili.co`], //
  [`boss.hdslb.com`, `shjd-boss.bilibili.co`],
]);

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

export function enableProxy() {
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const url = details.url;
    const proxied = proxiedUrl(url);
    if (proxied === url) {
      return callback({ cancel: false });
    } else {
      logger.debug(TAG, `${url} -> ${proxied}`);
      callback({ cancel: false, redirectURL: proxied });
    }
  });
}
