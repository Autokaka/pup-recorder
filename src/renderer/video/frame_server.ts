// Created by Autokaka (qq1909698494@gmail.com) on 2026/05/18.

import { createHash } from "node:crypto";
import { DecodeSession } from "./decode_session";
import { probe } from "./probe";

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
  /** Seconds of corrupt/empty leading content held on the first decodable frame. */
  leadGap: number;
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
  private _sessions = new Map<string, Entry>();
  private _closed = false;

  // closed-checked after probe so closeAll() can't race a slow open into a leaked session.
  async open(opts: OpenOptions): Promise<VideoMeta> {
    if (this._closed) {
      throw new Error("frame-server: closed");
    }
    const id = key(opts);
    const hit = this._sessions.get(id);
    if (hit) {
      hit.refs++;
      return hit.session.meta;
    }
    const info = await probe(opts.src);
    if (this._closed) {
      throw new Error("frame-server: closed");
    }
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
      leadGap: info.leadGap,
    };
    this._sessions.set(id, { session: new DecodeSession(meta, opts.src), refs: 1 });
    return meta;
  }

  getFrame(id: string, idx: number): Promise<Buffer> {
    const e = this._sessions.get(id);
    if (!e) {
      return Promise.resolve(Buffer.alloc(0));
    }
    return e.session.getFrame(idx);
  }

  close(id: string): void {
    const e = this._sessions.get(id);
    if (!e) {
      return;
    }
    if (--e.refs > 0) {
      return;
    }
    e.session.close();
    this._sessions.delete(id);
  }

  closeAll(): void {
    this._closed = true;
    for (const [, e] of this._sessions) {
      e.session.close();
    }
    this._sessions.clear();
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
