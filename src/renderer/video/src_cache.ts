// Created by Autokaka (qq1909698494@gmail.com) on 2026/05/22.

import { createHash } from "crypto";
import { existsSync } from "fs";
import { mkdir, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { logger } from "../../base/logging";

const TAG = "[VideoSrcCache]";
const CACHE_DIR = join(tmpdir(), "pup-video-cache");

export class SrcCache {
  private inFlight = new Map<string, Promise<string>>();
  private ctrl = new AbortController();

  localize(src: string): Promise<string> {
    if (!src.startsWith("http://") && !src.startsWith("https://")) return Promise.resolve(src);
    let p = this.inFlight.get(src);
    if (!p) {
      p = this.download(src);
      this.inFlight.set(src, p);
    }
    return p;
  }

  // aborts in-flight fetches so callers waiting on closeAll() don't hang on a slow CDN.
  abort(): void {
    this.ctrl.abort();
    this.inFlight.clear();
  }

  async clear(): Promise<void> {
    this.abort();
    await rm(CACHE_DIR, { recursive: true, force: true });
    logger.debug(TAG, `cleaned cache ${CACHE_DIR}`);
  }

  private async download(src: string): Promise<string> {
    await mkdir(CACHE_DIR, { recursive: true });
    const dst = join(CACHE_DIR, `${createHash("sha1").update(src).digest("hex")}${pickExt(src)}`);
    if (existsSync(dst)) return dst;
    const t0 = Date.now();
    const res = await fetch(src, { signal: this.ctrl.signal });
    if (!res.ok) throw new Error(`video src download failed ${res.status}: ${src}`);
    await writeFile(dst, Buffer.from(await res.arrayBuffer()));
    logger.debug(TAG, `cached ${src} -> ${dst} in ${Date.now() - t0}ms`);
    return dst;
  }
}

function pickExt(url: string): string {
  const m = url.match(/\.(mp4|mov|webm|m4v)(?:\?|$|#)/i);
  return m?.[1] ? `.${m[1].toLowerCase()}` : ".mp4";
}
