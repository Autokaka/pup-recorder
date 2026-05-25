// Created by Lu Ao (luao@bilibili.com) on 2026/05/22.

import { createHash } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { logger } from "../../base/logging";

const TAG = "[VideoSrcCache]";
const CACHE_DIR = join(tmpdir(), "pup-video-cache");
const cache = new Map<string, Promise<string>>();

export function localize(src: string): Promise<string> {
  if (!src.startsWith("http://") && !src.startsWith("https://")) return Promise.resolve(src);
  let p = cache.get(src);
  if (!p) {
    p = download(src);
    cache.set(src, p);
  }
  return p;
}

async function download(src: string): Promise<string> {
  await mkdir(CACHE_DIR, { recursive: true });
  const hash = createHash("sha1").update(src).digest("hex");
  const ext = pickExt(src);
  const dst = join(CACHE_DIR, `${hash}${ext}`);
  const t0 = Date.now();
  const res = await fetch(src);
  if (!res.ok) throw new Error(`video src download failed ${res.status}: ${src}`);
  await writeFile(dst, Buffer.from(await res.arrayBuffer()));
  logger.debug(TAG, `cached ${src} -> ${dst} in ${Date.now() - t0}ms`);
  return dst;
}

function pickExt(url: string): string {
  const m = url.match(/\.(mp4|mov|webm|m4v)(?:\?|$|#)/i);
  return m?.[1] ? `.${m[1].toLowerCase()}` : ".mp4";
}
