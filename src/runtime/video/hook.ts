// Created by Autokaka (qq1909698494@gmail.com) on 2026/06/02.

import { advance } from "./driver";
import { FrameCache } from "./frame_cache";
import { installMediaShim } from "./media_shim";
import { fitRect, setupCanvas } from "./overlay";
import { newVideoState, openSession } from "./session";
import { AHEAD, fire, SCHEME, TAG, type VideoMeta, type VideoState } from "./types";

declare global {
  interface Window {
    __pup_video__?: { advance: (ms: number) => Promise<unknown>; ready: () => Promise<void> };
  }
  interface HTMLVideoElement {
    __pup_last_src__?: string;
  }
}

export class VideoHook {
  readonly sessions = new WeakMap<HTMLVideoElement, VideoState>();
  readonly attaching = new WeakMap<HTMLVideoElement, Promise<VideoState | undefined>>();
  // Enumerable mirror of in-flight opens (WeakMap isn't iterable) so ready() can await them.
  readonly opening = new Set<Promise<unknown>>();
  readonly cache = new FrameCache();
  rvfcSeq = 0;
  currMs = 0;
  private _upgrading = new WeakSet<HTMLVideoElement>();
  private _lastUpgradeAt = new WeakMap<HTMLVideoElement, number>();
  private _lastSnapshot = new WeakMap<HTMLVideoElement, OffscreenCanvas>();

  install(): void {
    installMediaShim(this);
    this.scan(document.documentElement);
    new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === "attributes" && m.target instanceof HTMLVideoElement && m.attributeName === "src") {
          this.onSrcChange(m.target);
          continue;
        }
        m.addedNodes.forEach((n) => {
          if (n instanceof Element) {
            this.scan(n);
          }
        });
        m.removedNodes.forEach((n) => {
          if (n instanceof HTMLVideoElement) {
            this.detach(n);
          }
        });
      }
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["src"] });
    window.__pup_video__ = { advance: (ms) => advance(this, ms), ready: () => this.ready() };
  }

  attach(video: HTMLVideoElement, native = false): Promise<VideoState | undefined> {
    const existing = this.sessions.get(video);
    if (existing) {
      return Promise.resolve(existing);
    }
    const pending = this.attaching.get(video);
    if (pending) {
      return pending;
    }
    const src = video.src || video.currentSrc;
    if (!src) {
      return Promise.resolve(undefined);
    }
    if (/^(blob:|data:|mediastream:)/i.test(src)) {
      return Promise.resolve(undefined);
    }
    const cv = setupCanvas(video, this._lastSnapshot.get(video));
    const state = newVideoState(video, cv);
    this.sessions.set(video, state);
    const p = openSession(this, { video, state, src, birthMs: this.currMs, native }).finally(() => {
      this.attaching.delete(video);
      this.opening.delete(p);
    });
    this.attaching.set(video, p);
    this.opening.add(p);
    return p;
  }

  // Await only the opens in flight right now — never chase newly-spawned ones, or a retrying page loops forever.
  async ready(): Promise<void> {
    await Promise.allSettled([...this.opening]);
  }

  resume(video: HTMLVideoElement, state: VideoState): void {
    if (!state.paused && !state.ended) {
      return;
    }
    state.paused = false;
    state.ended = false;
    fire(video, "play");
    fire(video, "playing");
  }

  detach(video: HTMLVideoElement): void {
    const state = this.sessions.get(video);
    if (!state) {
      return;
    }
    if (state.meta) {
      if (state.lastDrawnIdx >= 0) {
        try {
          const snap = new OffscreenCanvas(state.cv.width, state.cv.height);
          const sctx = snap.getContext("2d");
          if (!sctx) {
            throw new Error("no 2d context");
          }
          sctx.drawImage(state.cv, 0, 0);
          this._lastSnapshot.set(video, snap);
        } catch {}
      }
      this.cache.release(state.meta.id, state); // stale bitmaps must not survive a detach; fresh open re-keys to the new session
    }
    state.cv.remove();
    this.sessions.delete(video);
    this.attaching.delete(video);
  }

  onSrcChange(video: HTMLVideoElement): void {
    const src = video.src || video.currentSrc || "";
    if (video.__pup_last_src__ === src) {
      return;
    }
    video.__pup_last_src__ = src;
    if (this.sessions.has(video)) {
      this.detach(video);
    }
    this.attach(video);
  }

  isUpgrading(video: HTMLVideoElement): boolean {
    return this._upgrading.has(video);
  }

  // Background native swap: the old canvas keeps painting until the first native frame is decoded, so no blank/jump.
  async upgrade(video: HTMLVideoElement, state: VideoState): Promise<void> {
    const meta = state.meta;
    if (!meta || meta.frameWidth >= meta.width || this._upgrading.has(video)) {
      return;
    }
    const src = video.src || video.currentSrc;
    if (!src) {
      return;
    }
    // Back off after a failed open so a wedged source isn't re-probed every tick.
    if (performance.now() - (this._lastUpgradeAt.get(video) ?? 0) < 1000) {
      return;
    }
    this._lastUpgradeAt.set(video, performance.now());
    this._upgrading.add(video);
    let ns: VideoState | undefined;
    try {
      ns = await this.openNative(src, meta.fps);
      if (!ns || this.sessions.get(video) !== state) {
        return;
      }
      // Decode the frame the clock is at right now so the swap lands on matching content.
      const idx = Math.max(1, Math.round(state.currentTime * meta.fps));
      const bm = await this.cache.fetch(ns, idx);
      if (!bm || this.sessions.get(video) !== state) {
        return;
      }
      this.commitUpgrade(state, ns, bm, idx);
      ns = undefined; // committed: the live state owns the session now
    } catch (e) {
      console.error(TAG, `upgrade failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      // Aborted (stale session / src change) or failed: close the warm-up session so it can't leak.
      if (ns?.meta) {
        await fetch(`${SCHEME}close?id=${ns.meta.id}`, { keepalive: true }).catch(() => undefined);
      }
      this._upgrading.delete(video);
    }
  }

  // Opens a native-resolution session without touching the live state (no events, no canvas swap).
  private async openNative(src: string, fps: number): Promise<VideoState | undefined> {
    try {
      const res = await fetch(`${SCHEME}open?src=${encodeURIComponent(src)}&fps=${fps}`);
      if (!res.ok) {
        return undefined;
      }
      const meta = (await res.json()) as VideoMeta;
      return { meta } as VideoState;
    } catch {
      return undefined;
    }
  }

  // Repoint the live state at the native session and paint the pre-decoded frame in the same tick.
  private commitUpgrade(state: VideoState, ns: VideoState, bm: ImageBitmap, idx: number): void {
    const nmeta = ns.meta!;
    const oldId = state.meta!.id;
    const cv = state.cv;
    // Backing store resize wipes the canvas, so draw the ready frame immediately after it.
    cv.width = nmeta.frameWidth;
    cv.height = nmeta.frameHeight;
    const r = fitRect(bm.width, bm.height, cv.width, cv.height, state.objectFit);
    state.ctx.clearRect(0, 0, cv.width, cv.height);
    state.ctx.drawImage(bm, r[0], r[1], r[2], r[3]);
    state.lastDrawnIdx = idx;
    state.meta = nmeta;
    // The pre-decoded frame now lives in the native cache under nmeta.id; drop the old session + its bitmaps.
    this.cache.release(oldId, state);
    this.cache.prefetch(state, idx + 1, AHEAD - 1);
  }

  private scan(root: Element | null): void {
    if (!root) {
      return;
    }
    if (root.tagName === "VIDEO") {
      this.attach(root as HTMLVideoElement);
    }
    if (root.querySelectorAll) {
      root.querySelectorAll("video").forEach((v) => {
        this.attach(v);
      });
    }
  }
}

export function installVideoHook(): void {
  if (window.__pup_video__) {
    return;
  }
  new VideoHook().install();
}
