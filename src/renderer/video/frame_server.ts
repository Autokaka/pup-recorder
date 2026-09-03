// Created by Autokaka (qq1909698494@gmail.com) on 2026/05/18.

import { useRetry } from "../../base/retry";
import { proxiedUrl } from "../network";
import { DecodeSession } from "./decode_session";
import { type ProbeResult, probe } from "./probe";
import { encodeStubWebm } from "./stub";

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

export class FrameServer {
  private _sessions = new Map<string, DecodeSession>();
  private _probes = new Map<string, Promise<ProbeResult>>();
  private _stubs = new Map<string, Promise<Buffer>>();
  private _seq = 0;
  private _closed = false;

  // -d decode bypasses the window interceptor, so it remaps hosts itself when the inner proxy is on.
  constructor(private readonly _useInnerProxy: boolean) {}

  // One session per <video> element: a session is a single playback head, so same-src elements must not share it.
  async open(opts: OpenOptions): Promise<VideoMeta> {
    if (this._closed) {
      throw new Error("frame-server: closed");
    }
    const src = this._useInnerProxy ? proxiedUrl(opts.src) : opts.src;
    const info = await this.probeCached(src);
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
      id: String(++this._seq),
      width: info.width,
      height: info.height,
      frameWidth,
      frameHeight,
      fps: opts.fps,
      duration: info.duration,
      leadGap: info.leadGap,
    };
    this._sessions.set(meta.id, new DecodeSession(meta, src));
    return meta;
  }

  // Deterministic media requests redirect here: real parseable bytes with true intrinsic size + duration.
  stub(src: string): Promise<Buffer> {
    if (this._closed) {
      throw new Error("frame-server: closed");
    }
    const real = this._useInnerProxy ? proxiedUrl(src) : src;
    const hit = this._stubs.get(real);
    if (hit) {
      return hit;
    }
    const p = this.probeCached(real).then((info) =>
      encodeStubWebm({
        width: info.width,
        height: info.height,
        duration: info.duration,
      }),
    );
    p.catch(() => this._stubs.delete(real));
    this._stubs.set(real, p);
    return p;
  }

  async getFrame(id: string, idx: number): Promise<Buffer | undefined> {
    return this._sessions.get(id)?.getFrame(idx);
  }

  async close(id: string): Promise<void> {
    const s = this._sessions.get(id);
    if (!s) {
      return;
    }
    this._sessions.delete(id);
    await s.close();
  }

  // Failed probes evict so a transient source error can retry on the next request.
  private probeCached(src: string): Promise<ProbeResult> {
    const hit = this._probes.get(src);
    if (hit) {
      return hit;
    }
    const p = useRetry({ fn: probe })(src);
    p.catch(() => this._probes.delete(src));
    this._probes.set(src, p);
    return p;
  }

  async closeAll(): Promise<void> {
    this._closed = true;
    const sessions = [...this._sessions.values()];
    this._sessions.clear();
    await Promise.all(sessions.map((s) => s.close()));
  }
}

// Round down to an even integer (≥2) for the scaler.
function even(n: number): number {
  const r = Math.round(n);
  return Math.max(2, r - (r % 2));
}
