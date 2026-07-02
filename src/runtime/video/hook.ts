// Created by Autokaka (qq1909698494@gmail.com) on 2026/06/02.

import { advance } from "./driver";
import { FrameCache } from "./frame_cache";
import { installMediaShim } from "./media_shim";
import { setupCanvas } from "./overlay";
import { newVideoState, openSession } from "./session";
import { fire, type VideoState } from "./types";

declare global {
  interface Window {
    __pup_video__?: { advance: (ms: number) => Promise<unknown>; ready: () => Promise<void> };
  }
  interface HTMLVideoElement {
    __pupLastSrc?: string;
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
      this.cache.release(state.meta.id, state);
    }
    state.cv.remove();
    this.sessions.delete(video);
    this.attaching.delete(video);
  }

  onSrcChange(video: HTMLVideoElement): void {
    const src = video.src || video.currentSrc || "";
    if (video.__pupLastSrc === src) {
      return;
    }
    video.__pupLastSrc = src;
    if (this.sessions.has(video)) {
      this.detach(video);
    }
    this.attach(video);
  }

  // Re-open at native resolution (the element outgrew the downscaled decode), preserving playback state.
  reattach(video: HTMLVideoElement, state: VideoState): void {
    const t = state.currentTime;
    const paused = state.paused;
    const ended = state.ended;
    this.detach(video);
    void this.attach(video, true).then((ns) => {
      if (!ns) {
        return;
      }
      ns.currentTime = t;
      ns.paused = paused;
      ns.ended = ended;
    });
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
