// Created by Lu Ao (luao@bilibili.com) on 2026/05/18.

import type { WebFrameMain } from "electron";
import { logger } from "../../base/logging";
import { withTimeout } from "../../base/timing";

const TAG = "[Video]";
export const VIDEO_SYMBOL = "__pup_video__";

// Sidecar shim: observes page-driven <video> state, paints matching decoded frames to a style-mirrored overlay canvas.
const HOOK = `(function() {
  if (window.self === window.top) return;
  if (typeof ${VIDEO_SYMBOL} !== 'undefined') return;

  const SCHEME = 'pup-frame://';
  const HVE = HTMLVideoElement.prototype;
  const MEDIA = HTMLMediaElement.prototype;
  const origPause = HVE.pause;
  const ctDesc = Object.getOwnPropertyDescriptor(HVE, 'currentTime') || Object.getOwnPropertyDescriptor(MEDIA, 'currentTime');
  const pausedDesc = Object.getOwnPropertyDescriptor(HVE, 'paused') || Object.getOwnPropertyDescriptor(MEDIA, 'paused');
  const endedDesc = Object.getOwnPropertyDescriptor(HVE, 'ended') || Object.getOwnPropertyDescriptor(MEDIA, 'ended');
  const srcDesc = Object.getOwnPropertyDescriptor(HVE, 'src') || Object.getOwnPropertyDescriptor(MEDIA, 'src');

  const sessions = new WeakMap();
  const attaching = new WeakMap();
  let currMs = 0;
  let lastMs = 0;

  // Properties mirrored from <video> to canvas overlay so page CSS still applies visually.
  const MIRROR_PROPS = [
    'borderRadius', 'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius',
    'transform', 'transformOrigin', 'filter', 'clipPath', 'boxShadow', 'opacity', 'mixBlendMode', 'mask',
    'zIndex', 'position', 'left', 'top', 'right', 'bottom',
  ];

  function setupCanvas(video) {
    const cv = document.createElement('canvas');
    cv.dataset.pupVideoOverlay = '1';
    cv.style.pointerEvents = 'none';
    // visibility:hidden so the native pipeline doesn't paint; opacity left to page CSS.
    video.style.visibility = 'hidden';
    video.muted = true;
    const parent = video.parentNode || document.body;
    parent.insertBefore(cv, video.nextSibling);
    syncOverlay(video, cv);
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

  // Computed object-fit → drawImage geometry; defaults to 'fill'.
  function fitRect(args) {
    const srcW = args.srcW, srcH = args.srcH, dstW = args.dstW, dstH = args.dstH, fit = args.fit;
    if (fit === 'none') {
      return [(dstW - srcW) / 2, (dstH - srcH) / 2, srcW, srcH];
    }
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
    return [0, 0, dstW, dstH]; // 'fill'
  }

  function attach(video) {
    if (sessions.has(video)) return Promise.resolve(sessions.get(video));
    const pending = attaching.get(video);
    if (pending) return pending;
    // Captured at call site to catch up the async open() probe latency on attach.
    const birthMs = currMs;
    const p = doAttach(video, birthMs).finally(() => attaching.delete(video));
    attaching.set(video, p);
    return p;
  }

  async function doAttach(video, birthMs) {
    // video.src reflects setter assignment synchronously; currentSrc lags until load runs.
    const src = video.src || video.currentSrc;
    if (!src) return null;
    // frame_server decodes via ffmpeg, which cannot read browser-internal URLs — leave native.
    if (/^(blob:|data:|mediastream:)/i.test(src)) return null;
    const fps = parseInt(video.dataset.pupFps || '30', 10);
    const res = await fetch(SCHEME + 'open?src=' + encodeURIComponent(src) + '&fps=' + fps);
    if (!res.ok) return null;
    const meta = await res.json();
    const cv = setupCanvas(video);
    const playing = video.autoplay || !video.paused;
    const state = {
      meta: meta,
      cv: cv,
      ctx: cv.getContext('2d'),
      paused: !playing,
      currentTime: playing ? Math.max(0, (currMs - birthMs) / 1000) : 0,
      ended: false,
      lastDrawnIdx: -1,
      failures: 0,
      dead: false,
    };
    sessions.set(video, state);
    Object.defineProperty(video, 'videoWidth', { value: meta.width, configurable: true });
    Object.defineProperty(video, 'videoHeight', { value: meta.height, configurable: true });
    Object.defineProperty(video, 'duration', { value: meta.duration, configurable: true });
    Object.defineProperty(video, 'readyState', { value: 4, configurable: true });
    // Standard HTMLMediaElement load lifecycle so pages awaiting these can proceed.
    video.dispatchEvent(new Event('loadstart'));
    video.dispatchEvent(new Event('durationchange'));
    video.dispatchEvent(new Event('loadedmetadata'));
    video.dispatchEvent(new Event('loadeddata'));
    video.dispatchEvent(new Event('canplay'));
    video.dispatchEvent(new Event('canplaythrough'));
    if (playing) {
      video.dispatchEvent(new Event('play'));
      video.dispatchEvent(new Event('playing'));
    }
    return state;
  }

  function detach(video) {
    const state = sessions.get(video);
    if (!state) return;
    fetch(SCHEME + 'close?id=' + state.meta.id, { keepalive: true });
    state.cv.remove();
    sessions.delete(video);
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
    if (!state.paused) {
      state.paused = true;
      this.dispatchEvent(new Event('pause'));
    }
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
      get: function() {
        const s = sessions.get(this);
        return s ? s.currentTime : ctDesc.get.call(this);
      },
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
    if (sessions.has(video)) detach(video);
    attach(video);
  }

  function scan(root) {
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
      set: function(v) {
        srcDesc.set.call(this, v);
        onSrcChange(this);
      },
    });
  }

  // Returns undefined (sync) when no work — avoids a microtask-only Promise CDP may not report.
  function advance(timestampMs) {
    lastMs = currMs;
    currMs = timestampMs;
    const dt = Math.max(0, currMs - lastMs) / 1000;
    const work = [];
    document.querySelectorAll('video').forEach((v) => {
      const state = sessions.get(v);
      if (!state || state.dead) return;
      if (!state.paused && !state.ended) {
        state.currentTime += dt * (v.playbackRate || 1);
        if (state.currentTime >= state.meta.duration) {
          if (v.loop) {
            state.currentTime = state.currentTime % state.meta.duration;
          } else {
            state.currentTime = state.meta.duration;
            state.paused = true;
            state.ended = true;
            v.dispatchEvent(new Event('ended'));
          }
        } else {
          v.dispatchEvent(new Event('timeupdate'));
        }
      }
      // No ResizeObserver under paused vtime; re-pin geometry every tick.
      syncOverlay(v, state.cv);
      const idx = Math.round(state.currentTime * state.meta.fps);
      if (idx === state.lastDrawnIdx) return;
      work.push(paint(v, state, idx));
    });
    return work.length ? Promise.all(work) : undefined;
  }

  async function paint(video, state, idx) {
    try {
      const res = await fetch(SCHEME + 'frame?id=' + state.meta.id + '&idx=' + idx);
      // 410 Gone = past last decoded frame; keep last frame on canvas.
      if (res.status === 410) return;
      if (!res.ok) {
        console.error('[pup-video] frame ' + idx + ' http ' + res.status);
        if (++state.failures >= 3) state.dead = true;
        return;
      }
      state.failures = 0;
      const blob = await res.blob();
      const bm = await createImageBitmap(blob);
      const cv = state.cv;
      const fit = window.getComputedStyle(video).objectFit || 'fill';
      const r = fitRect({ srcW: bm.width, srcH: bm.height, dstW: cv.width, dstH: cv.height, fit });
      state.ctx.clearRect(0, 0, cv.width, cv.height);
      state.ctx.drawImage(bm, r[0], r[1], r[2], r[3]);
      bm.close();
      state.lastDrawnIdx = idx;
    } catch (e) {
      console.error('[pup-video] paint frame ' + idx + ' failed: ' + (e && e.message || e));
      if (++state.failures >= 3) state.dead = true;
    }
  }

  window.${VIDEO_SYMBOL} = { advance: advance };
})();`;

// Backstop above frame_server's 5s per-frame wait.
const ADVANCE_TIMEOUT_MS = 10_000;

export async function advanceVideos(frame: WebFrameMain | undefined, timestampMs: number): Promise<void> {
  // Blank/navigating frame orphans the CDP promise; skip. Shim failure must not abort render.
  if (!frame || !frame.url) return;
  try {
    const ev = frame.executeJavaScript(`${HOOK} ${VIDEO_SYMBOL}.advance(${timestampMs})`);
    await withTimeout(ev, ADVANCE_TIMEOUT_MS, "video.advance");
  } catch (e) {
    logger.warn(TAG, `advance skipped: ${e instanceof Error ? e.message : String(e)}`);
  }
}
