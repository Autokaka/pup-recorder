// Created by Autokaka (qq1909698494@gmail.com) on 2026/05/18.

import { createHash } from "crypto";
import { DecodeSession } from "./decode_session";
import { probe } from "./probe";
import { SrcCache } from "./src_cache";

export interface VideoMeta {
  id: string;
  /** Intrinsic source dimensions (reported as videoWidth/videoHeight). */
  width: number;
  height: number;
  /** Decoded+scaled frame dimensions actually served (≤ source; capped to the display box). */
  frameWidth: number;
  frameHeight: number;
  fps: number;
  duration: number;
}

export interface OpenOptions {
  src: string;
  fps: number;
  /** Display-box pixels (canvas backing store); decode is downscaled to cover this, never upscaled. */
  dstW?: number;
  dstH?: number;
  /** objectFit; "none" needs 1:1 native pixels so it skips downscale. */
  fit?: string;
}

interface Entry {
  session: DecodeSession;
  refs: number;
}

export class FrameServer {
  private sessions = new Map<string, Entry>();
  private srcs = new SrcCache();
  private inFlightOpens = new Set<Promise<unknown>>();
  private closed = false;

  async open(opts: OpenOptions): Promise<VideoMeta> {
    const p = this.openInner(opts);
    this.inFlightOpens.add(p);
    try {
      return await p;
    } finally {
      this.inFlightOpens.delete(p);
    }
  }

  // closed-checked after every await so closeAll() can't race srcs.clear() against localize/probe.
  private async openInner(opts: OpenOptions): Promise<VideoMeta> {
    if (this.closed) throw new Error("frame-server: closed");
    const id = key(opts);
    const hit = this.sessions.get(id);
    if (hit) {
      hit.refs++;
      return hit.session.meta;
    }
    const localPath = await this.srcs.localize(opts.src);
    if (this.closed) throw new Error("frame-server: closed");
    const info = await probe(localPath);
    if (this.closed) throw new Error("frame-server: closed");
    let frameWidth = info.width;
    let frameHeight = info.height;
    // Downscale to cover the display box (never upscale); objectFit "none" needs 1:1 native pixels.
    if (opts.dstW && opts.dstH && opts.fit !== "none") {
      const s = Math.min(1, Math.max(opts.dstW / info.width, opts.dstH / info.height));
      frameWidth = even(info.width * s);
      frameHeight = even(info.height * s);
    }
    const meta: VideoMeta = {
      id,
      width: info.width,
      height: info.height,
      frameWidth,
      frameHeight,
      fps: opts.fps,
      duration: info.duration,
    };
    this.sessions.set(id, { session: new DecodeSession(meta, localPath), refs: 1 });
    return meta;
  }

  getFrame(id: string, idx: number): Promise<Buffer> {
    const e = this.sessions.get(id);
    if (!e) return Promise.resolve(Buffer.alloc(0));
    return e.session.getFrame(idx);
  }

  close(id: string): void {
    const e = this.sessions.get(id);
    if (!e) return;
    if (--e.refs > 0) return;
    e.session.close();
    this.sessions.delete(id);
  }

  async closeAll(): Promise<void> {
    // abort in-flight fetches first so allSettled doesn't hang on a slow CDN.
    this.closed = true;
    this.srcs.abort();
    await Promise.allSettled([...this.inFlightOpens]);
    for (const [, e] of this.sessions) e.session.close();
    this.sessions.clear();
    await this.srcs.clear();
  }
}

function key(opts: OpenOptions): string {
  return createHash("sha1")
    .update(`${opts.src}|${opts.fps}|${opts.dstW ?? ""}|${opts.dstH ?? ""}|${opts.fit ?? ""}`)
    .digest("hex");
}

// Round down to an even integer (≥2) for the scaler.
function even(n: number): number {
  const r = Math.round(n);
  return Math.max(2, r - (r % 2));
}

export const frameServer = new FrameServer();
