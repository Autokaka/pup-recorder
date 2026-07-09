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
  stubMedia?: boolean;
}

export function setInterceptor({ source, window, useInnerProxy, stubMedia }: NetworkOptions) {
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
    // Swap media for a frame-server stub (true intrinsic size/duration) so Blink lays out like Chrome.
    if (stubMedia && details.resourceType === "media" && !url.startsWith("pup-frame:")) {
      callback({
        redirectURL: `pup-frame://stub?src=${encodeURIComponent(url)}`,
      });
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
    const { url, method, error, resourceType } = details;
    // Stubbed media downgrades: ERR_ABORTED is just the loader restarting onto the cross-scheme redirect.
    const media = stubMedia && resourceType === "media";
    const level = media ? (error === "net::ERR_ABORTED" ? "debug" : "warn") : "error";
    logger[level](TAG, `error:`, { key, url, method, error, resourceType, source });
  });
}

export function unsetInterceptor(window: BrowserWindow) {
  const req = window.webContents.session.webRequest;
  req.onBeforeRequest(null);
  req.onHeadersReceived(null);
  req.onCompleted(null);
  req.onErrorOccurred(null);
}
