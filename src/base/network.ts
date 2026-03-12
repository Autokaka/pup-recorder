// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/09.

import { BrowserWindow } from "electron";
import { URL } from "url";
import { ConcurrencyLimiter } from "./limiter";
import { logger } from "./logging";
import { WaitableEvent } from "./waitable_event";

const TAG = "[Network]";

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

export interface NetworkOptions {
  source: string;
  window: BrowserWindow;
  useInnerProxy?: boolean;
}

export function setInterceptor({
  source,
  window,
  useInnerProxy,
}: NetworkOptions) {
  const req = window.webContents.session.webRequest;
  const limiter = new ConcurrencyLimiter(64);
  const events = new Map<string, WaitableEvent>();

  async function wait(key: string, onTimeout?: () => void) {
    const event = new WaitableEvent();
    events.set(key, event);
    await event
      .wait({ timeout: 5_000, onTimeout })
      .finally(() => events.delete(key));
  }

  function signal(key: string) {
    events.get(key)?.signal();
  }

  req.onBeforeRequest((details, callback) => {
    const url = details.url;
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
    logger.error(TAG, `error:`, {
      key,
      url: details.url,
      method: details.method,
      error: details.error,
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
