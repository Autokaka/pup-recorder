// Created by Lu Ao (luao@bilibili.com) on 2026/05/18.

import type { WebFrameMain } from "electron";
import { logger } from "../../base/logging";
import { withTimeout } from "../../base/timing";

const TAG = "[Video]";
export const VIDEO_SYMBOL = "__pup_video__";

const HOOK = `(function() {
  if (window.self === window.top) return;
  if (typeof ${VIDEO_SYMBOL} !== 'undefined') return;

  const SCHEME = 'pup-frame://';
  const AHEAD = 10;
  const HVE = HTMLVideoElement.prototype;
  const MEDIA = HTMLMediaElement.prototype;
  const origPause = HVE.pause;
  const ctDesc = Object.getOwnPropertyDescriptor(HVE, 'currentTime') || Object.getOwnPropertyDescriptor(MEDIA, 'currentTime');
  const pausedDesc = Object.getOwnPropertyDescriptor(HVE, 'paused') || Object.getOwnPropertyDescriptor(MEDIA, 'paused');
  const endedDesc = Object.getOwnPropertyDescriptor(HVE, 'ended') || Object.getOwnPropertyDescriptor(MEDIA, 'ended');
  const srcDesc = Object.getOwnPropertyDescriptor(HVE, 'src') || Object.getOwnPropertyDescriptor(MEDIA, 'src');

  const sessions = new WeakMap();
  const attaching = new WeakMap();
  const lastSnapshot = new WeakMap();
  const caches = new Map();
  let currMs = 0;
  let lastMs = 0;

  const MIRROR_PROPS = [
    'borderRadius','borderTopLeftRadius','borderTopRightRadius','borderBottomLeftRadius','borderBottomRightRadius',
    'transform','transformOrigin','filter','clipPath','boxShadow','opacity','mixBlendMode','mask',
    'zIndex','position','left','top','right','bottom',
  ];

  function getCache(id) {
    let c = caches.get(id);
    if (!c) {
      c = { bitmaps: new Map(), inFlight: new Map(), readers: new Map() };
      caches.set(id, c);
    }
    return c;
  }

  function fetchBitmap(state, idx) {
    const c = getCache(state.meta.id);
    const existing = c.inFlight.get(idx);
    if (existing) return existing;
    if (c.bitmaps.has(idx)) return Promise.resolve(c.bitmaps.get(idx));
    const p = fetch(SCHEME + 'frame?id=' + state.meta.id + '&idx=' + idx)
      .then((r) => r.ok ? r.blob() : null)
      .then((b) => b ? createImageBitmap(b) : null)
      .then((bm) => { c.inFlight.delete(idx); if (bm) c.bitmaps.set(idx, bm); return bm; })
      .catch(() => { c.inFlight.delete(idx); return null; });
    c.inFlight.set(idx, p);
    return p;
  }

  function ensurePrefetched(state, fromIdx, count) {
    const maxIdx = Math.max(1, Math.round(state.meta.duration * state.meta.fps));
    for (let i = fromIdx; i < fromIdx + count; i++) {
      if (i < 1 || i > maxIdx) continue;
      fetchBitmap(state, i);
    }
  }

  function evictOld(c) {
    let minIdx = Infinity;
    c.readers.forEach((idx) => { if (idx < minIdx) minIdx = idx; });
    if (!isFinite(minIdx)) return;
    const floor = minIdx - 2;
    c.bitmaps.forEach((bm, idx) => {
      if (idx < floor) { bm.close(); c.bitmaps.delete(idx); }
    });
  }

  function setupCanvas(video) {
    const cv = document.createElement('canvas');
    cv.dataset.pupVideoOverlay = '1';
    cv.style.pointerEvents = 'none';
    video.style.visibility = 'hidden';
    video.muted = true;
    const parent = video.parentNode || document.body;
    parent.insertBefore(cv, video.nextSibling);
    syncOverlay(video, cv);
    // Bridge cold-start: paint last-known frame of previous clip so canvas isn't blank while decoder warms up.
    const snap = lastSnapshot.get(video);
    if (snap) {
      try { cv.getContext('2d').drawImage(snap, 0, 0, cv.width, cv.height); } catch {}
    }
    return cv;
  }

  function syncOverlay(video, cv) {
    const cs = window.getComputedStyle(video);
    const offsetParent = video.offsetParent || document.body;
    const vr = video.getBoundingClientRect();
    const pr = offsetParent.getBoundingClientRect();
    cv.style.position = 'absolute';
    cv.style.left = (vr.left - pr.left) + 'px';
    cv.style.top = (vr.top - pr.top) + 'px';
    cv.style.width = vr.width + 'px';
    cv.style.height = vr.height + 'px';
    for (const p of MIRROR_PROPS) {
      if (p === 'position' || p === 'left' || p === 'top' || p === 'right' || p === 'bottom') continue;
      cv.style[p] = cs[p];
    }
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(vr.width * dpr));
    const h = Math.max(1, Math.round(vr.height * dpr));
    if (cv.width !== w) cv.width = w;
    if (cv.height !== h) cv.height = h;
  }

  function fitRect(srcW, srcH, dstW, dstH, fit) {
    if (fit === 'none') return [(dstW - srcW) / 2, (dstH - srcH) / 2, srcW, srcH];
    if (fit === 'contain' || fit === 'scale-down') {
      const sc = Math.min(dstW / srcW, dstH / srcH);
      const k = fit === 'scale-down' ? Math.min(1, sc) : sc;
      const ws = k * srcW, hs = k * srcH;
      return [(dstW - ws) / 2, (dstH - hs) / 2, ws, hs];
    }
    if (fit === 'cover') {
      const sc = Math.max(dstW / srcW, dstH / srcH);
      const ws = sc * srcW, hs = sc * srcH;
      return [(dstW - ws) / 2, (dstH - hs) / 2, ws, hs];
    }
    return [0, 0, dstW, dstH];
  }

  function attach(video) {
    if (sessions.has(video)) return Promise.resolve(sessions.get(video));
    const pending = attaching.get(video);
    if (pending) return pending;
    const src = video.src || video.currentSrc;
    if (!src) return Promise.resolve(null);
    if (/^(blob:|data:|mediastream:)/i.test(src)) return Promise.resolve(null);
    const cv = setupCanvas(video);
    const birthMs = currMs;
    const state = {
      meta: null, cv: cv, ctx: cv.getContext('2d'),
      paused: !(video.autoplay || !video.paused),
      currentTime: 0, ended: false, lastDrawnIdx: -1, dead: false,
      objectFit: window.getComputedStyle(video).objectFit || 'fill',
    };
    sessions.set(video, state);
    const p = doAttach(video, state, src, birthMs).finally(() => attaching.delete(video));
    attaching.set(video, p);
    return p;
  }

  async function doAttach(video, state, src, birthMs) {
    const fps = parseInt(video.dataset.pupFps || '30', 10);
    const res = await fetch(SCHEME + 'open?src=' + encodeURIComponent(src) + '&fps=' + fps);
    if (sessions.get(video) !== state) return null;
    if (!res.ok) { state.dead = true; return null; }
    const meta = await res.json();
    if (sessions.get(video) !== state) return null;
    state.meta = meta;
    state.currentTime = state.paused ? 0 : Math.max(0, (currMs - birthMs) / 1000);
    Object.defineProperty(video, 'videoWidth', { value: meta.width, configurable: true });
    Object.defineProperty(video, 'videoHeight', { value: meta.height, configurable: true });
    Object.defineProperty(video, 'duration', { value: meta.duration, configurable: true });
    Object.defineProperty(video, 'readyState', { value: 4, configurable: true });
    ['loadstart','durationchange','loadedmetadata','loadeddata','canplay','canplaythrough'].forEach((e) => {
      video.dispatchEvent(new Event(e));
    });
    if (!state.paused) {
      video.dispatchEvent(new Event('play'));
      video.dispatchEvent(new Event('playing'));
    }
    ensurePrefetched(state, 1, AHEAD);
    return state;
  }

  function detach(video) {
    const state = sessions.get(video);
    if (!state) return;
    if (state.meta) {
      // Snapshot current canvas so the next attach can paint it during decoder warmup — no blank gap on src swap.
      if (state.lastDrawnIdx >= 0) {
        try {
          const snap = new OffscreenCanvas(state.cv.width, state.cv.height);
          snap.getContext('2d').drawImage(state.cv, 0, 0);
          lastSnapshot.set(video, snap);
        } catch {}
      }
      const c = caches.get(state.meta.id);
      if (c) {
        c.readers.delete(state);
        if (c.readers.size === 0) {
          c.bitmaps.forEach((bm) => bm.close());
          caches.delete(state.meta.id);
          fetch(SCHEME + 'close?id=' + state.meta.id, { keepalive: true });
        }
      }
    }
    state.cv.remove();
    sessions.delete(video);
    attaching.delete(video);
  }

  function resume(video, state) {
    if (!state.paused && !state.ended) return;
    state.paused = false;
    state.ended = false;
    video.dispatchEvent(new Event('play'));
    video.dispatchEvent(new Event('playing'));
  }

  HVE.play = function() {
    const video = this;
    const state = sessions.get(video);
    if (!state) return attach(video).then((s) => { if (s) resume(video, s); });
    resume(video, state);
    return Promise.resolve();
  };
  HVE.pause = function() {
    const state = sessions.get(this);
    if (!state) { origPause.call(this); return; }
    if (!state.paused) { state.paused = true; this.dispatchEvent(new Event('pause')); }
  };
  Object.defineProperty(HVE, 'paused', {
    configurable: true,
    get: function() { const s = sessions.get(this); return s ? s.paused : pausedDesc.get.call(this); },
  });
  Object.defineProperty(HVE, 'ended', {
    configurable: true,
    get: function() { const s = sessions.get(this); return s ? s.ended : endedDesc.get.call(this); },
  });
  if (ctDesc) {
    Object.defineProperty(HVE, 'currentTime', {
      configurable: true,
      get: function() { const s = sessions.get(this); return s ? s.currentTime : ctDesc.get.call(this); },
      set: function(t) {
        const s = sessions.get(this);
        if (!s) { ctDesc.set.call(this, t); return; }
        s.currentTime = Math.max(0, Math.min(t, s.meta.duration));
        if (s.currentTime < s.meta.duration) s.ended = false;
        this.dispatchEvent(new Event('seeking'));
        this.dispatchEvent(new Event('seeked'));
        this.dispatchEvent(new Event('timeupdate'));
      },
    });
  }

  function onSrcChange(video) {
    // setter hook + MutationObserver both fire for one bgVideo.src = X assignment; dedupe by stored src.
    const src = video.src || video.currentSrc || '';
    if (video.__pupLastSrc === src) return;
    video.__pupLastSrc = src;
    if (sessions.has(video)) detach(video);
    attach(video);
  }
  function scan(root) {
    if (!root) return;
    if (root.tagName === 'VIDEO') attach(root);
    if (root.querySelectorAll) root.querySelectorAll('video').forEach((v) => attach(v));
  }
  scan(document.documentElement);
  new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === 'attributes' && m.target instanceof HTMLVideoElement && m.attributeName === 'src') {
        onSrcChange(m.target);
        continue;
      }
      for (const n of m.addedNodes) if (n instanceof Element) scan(n);
      for (const n of m.removedNodes) if (n instanceof HTMLVideoElement) detach(n);
    }
  }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['src'] });

  if (srcDesc && srcDesc.set) {
    Object.defineProperty(HVE, 'src', {
      configurable: true,
      get: srcDesc.get,
      set: function(v) { srcDesc.set.call(this, v); onSrcChange(this); },
    });
  }

  async function paint(video, state, idx) {
    const c = getCache(state.meta.id);
    c.readers.set(state, idx);
    let bm = c.bitmaps.get(idx);
    if (!bm) {
      ensurePrefetched(state, idx + 1, AHEAD - 1);
      bm = await fetchBitmap(state, idx);
      if (sessions.get(video) !== state) return;
      if (!bm) return;
    }
    const cv = state.cv;
    const r = fitRect(bm.width, bm.height, cv.width, cv.height, state.objectFit);
    state.ctx.clearRect(0, 0, cv.width, cv.height);
    state.ctx.drawImage(bm, r[0], r[1], r[2], r[3]);
    state.lastDrawnIdx = idx;
    ensurePrefetched(state, idx + 1, AHEAD);
    evictOld(c);
  }

  function advance(timestampMs) {
    lastMs = currMs;
    currMs = timestampMs;
    const dt = Math.max(0, currMs - lastMs) / 1000;
    const ps = [];
    document.querySelectorAll('video').forEach((v) => {
      const state = sessions.get(v);
      if (!state || state.dead) return;
      syncOverlay(v, state.cv);
      if (!state.meta) return;
      if (!state.paused && !state.ended) {
        state.currentTime += dt * (v.playbackRate || 1);
        if (state.currentTime >= state.meta.duration) {
          if (v.loop) { state.currentTime = state.currentTime % state.meta.duration; }
          else {
            state.currentTime = state.meta.duration;
            state.paused = true;
            state.ended = true;
            v.dispatchEvent(new Event('ended'));
          }
        } else {
          v.dispatchEvent(new Event('timeupdate'));
        }
      }
      const idx = Math.max(1, Math.round(state.currentTime * state.meta.fps));
      if (idx === state.lastDrawnIdx) return;
      ps.push(paint(v, state, idx));
    });
    return Promise.all(ps);
  }

  window.${VIDEO_SYMBOL} = { advance: advance };
})();`;

const ADVANCE_TIMEOUT_MS = 30_000;

export async function advanceVideos(frame: WebFrameMain | undefined, timestampMs: number): Promise<void> {
  if (!frame || !frame.url) return;
  try {
    const ev = frame.executeJavaScript(`${HOOK} ${VIDEO_SYMBOL}.advance(${timestampMs})`);
    await withTimeout(ev, ADVANCE_TIMEOUT_MS, "video.advance");
  } catch (e) {
    logger.warn(TAG, `advance skipped: ${e instanceof Error ? e.message : String(e)}`);
  }
}
