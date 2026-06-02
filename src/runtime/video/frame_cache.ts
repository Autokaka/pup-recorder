// Created by Autokaka (qq1909698494@gmail.com) on 2026/06/02.

import { SCHEME, type VideoCache, type VideoState } from "./types";

// Per-session bitmap cache: fetches RGBA frames from the frame protocol, dedupes in-flight, evicts behind readers.
export class FrameCache {
  private caches = new Map<string, VideoCache>();

  cacheOf(id: string): VideoCache {
    let c = this.caches.get(id);
    if (!c) {
      c = { bitmaps: new Map(), inFlight: new Map(), readers: new Map() };
      this.caches.set(id, c);
    }
    return c;
  }

  fetch(state: VideoState, idx: number): Promise<ImageBitmap | null> {
    const c = this.cacheOf(state.meta!.id);
    const existing = c.inFlight.get(idx);
    if (existing) return existing;
    const cached = c.bitmaps.get(idx);
    if (cached) return Promise.resolve(cached);
    const w = state.meta!.frameWidth;
    const h = state.meta!.frameHeight;
    const p = fetch(SCHEME + "frame?id=" + state.meta!.id + "&idx=" + idx)
      .then((r) => (r.ok ? r.arrayBuffer() : null))
      .then((buf) =>
        buf && buf.byteLength === w * h * 4 ? createImageBitmap(new ImageData(new Uint8ClampedArray(buf), w, h)) : null,
      )
      .then((bm) => {
        c.inFlight.delete(idx);
        if (bm) c.bitmaps.set(idx, bm);
        return bm;
      })
      .catch(() => {
        c.inFlight.delete(idx);
        return null;
      });
    c.inFlight.set(idx, p);
    return p;
  }

  prefetch(state: VideoState, fromIdx: number, count: number): void {
    const maxIdx = Math.max(1, Math.round(state.meta!.duration * state.meta!.fps));
    for (let i = fromIdx; i < fromIdx + count; i++) {
      if (i < 1 || i > maxIdx) continue;
      void this.fetch(state, i);
    }
  }

  evict(c: VideoCache): void {
    let minIdx = Infinity;
    c.readers.forEach((idx) => {
      if (idx < minIdx) minIdx = idx;
    });
    if (!isFinite(minIdx)) return;
    const floor = minIdx - 2;
    c.bitmaps.forEach((bm, idx) => {
      if (idx < floor) {
        bm.close();
        c.bitmaps.delete(idx);
      }
    });
  }

  // Drop a reader; when the last leaves, close bitmaps and tell the server to release the decode session.
  release(id: string, state: VideoState): void {
    const c = this.caches.get(id);
    if (!c) return;
    c.readers.delete(state);
    if (c.readers.size > 0) return;
    c.bitmaps.forEach((bm) => bm.close());
    this.caches.delete(id);
    fetch(SCHEME + "close?id=" + id, { keepalive: true });
  }
}
