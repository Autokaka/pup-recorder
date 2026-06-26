// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/09.

import { URL } from "node:url";
import type { BrowserWindow } from "electron";
import { ConcurrencyLimiter } from "../base/limiter";
import { logger } from "../base/logging";
import { WaitableEvent } from "../base/waitable_event";

const TAG = "[Network]";

const map = new Map([
  [`jssz-boss.hdslb.com`, `jssz-boss.bilibili.co`], //
  [`boss.hdslb.com`, `shjd-boss.bilibili.co`],
]);

const LOCAL_SCHEMES = ["pup:", "pup-frame:", "file:", "data:", "blob:", "chrome-extension:", "devtools:"];

function isLocalScheme(url: string): boolean {
  for (const s of LOCAL_SCHEMES) {
    if (url.startsWith(s)) {
      return true;
    }
  }
  return false;
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

export interface NetworkOptions {
  source: string;
  window: BrowserWindow;
  useInnerProxy?: boolean;
  cancelMedia?: boolean;
}

export function setInterceptor({ source, window, useInnerProxy, cancelMedia }: NetworkOptions) {
  const req = window.webContents.session.webRequest;
  const limiter = new ConcurrencyLimiter(256);
  const events = new Map<string, WaitableEvent>();

  async function wait(key: string, onTimeout?: () => void) {
    const event = new WaitableEvent();
    events.set(key, event);
    await event.wait({ timeout: 5_000, onTimeout }).finally(() => events.delete(key));
  }

  function signal(key: string) {
    events.get(key)?.signal();
  }

  req.onBeforeRequest((details, callback) => {
    const url = details.url;
    if (cancelMedia && details.resourceType === "media") {
      callback({ cancel: true });
      return;
    }
    const proxied = useInnerProxy ? proxiedUrl(url) : url;
    limiter.schedule(() => {
      const key = `${window.id}_${details.id}`;
      logger.debug(TAG, `start:`, {
        key,
        url,
        proxied,
        method: details.method,
        source,
        stats: limiter.stats,
      });
      if (proxied === url) {
        callback({ cancel: false });
      } else {
        callback({ cancel: false, redirectURL: proxied });
      }
      if (isLocalScheme(url)) {
        return Promise.resolve();
      }
      return wait(key, () => {
        logger.warn(TAG, `maybe timeout:`, {
          key,
          url,
          proxied,
          method: details.method,
          source,
        });
      });
    });
  });

  req.onHeadersReceived(({ responseHeaders }, callback) => {
    delete responseHeaders?.["x-frame-options"];
    delete responseHeaders?.["X-Frame-Options"];
    delete responseHeaders?.["content-security-policy"];
    delete responseHeaders?.["Content-Security-Policy"];
    callback({ cancel: false, responseHeaders });
  });

  req.onCompleted((details) => {
    const key = `${window.id}_${details.id}`;
    signal(key);
    logger.debug(TAG, `completed:`, {
      key,
      url: details.url,
      method: details.method,
      statusCode: details.statusCode,
      source,
    });
  });

  req.onErrorOccurred((details) => {
    const key = `${window.id}_${details.id}`;
    signal(key);
    if (cancelMedia && details.resourceType === "media" && details.error === "net::ERR_BLOCKED_BY_CLIENT") {
      return;
    }
    logger.error(TAG, `error:`, {
      key,
      url: details.url,
      method: details.method,
      error: details.error,
      resourceType: details.resourceType,
      source,
    });
  });
}

export function unsetInterceptor(window: BrowserWindow) {
  const req = window.webContents.session.webRequest;
  req.onBeforeRequest(null);
  req.onHeadersReceived(null);
  req.onCompleted(null);
  req.onErrorOccurred(null);
}
