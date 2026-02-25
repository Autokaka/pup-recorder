// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/09.

import { session } from "electron";
import { logger } from "./logging";

const TAG = "[Proxy]";

export function proxiedUrl(url: string) {
  if (!url.startsWith("http")) {
    return url;
  }
  // Redirect boss.hdslb.com to boss.bilibili.co
  const match = url.match(/^https:\/\/([^-]+)-boss\.hdslb\.com(.*)$/);
  if (match) {
    const [, prefix, path] = match;
    return `http://${prefix}-boss.bilibili.co${path}`;
  }
  return url;
}

export function enableProxy() {
  // Redirect boss.hdslb.com to boss.bilibili.co
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
