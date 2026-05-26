declare global {
  interface Window {
    __pup_video__?: { advance: (ms: number) => Promise<unknown> };
  }
  interface HTMLVideoElement {
    __pupLastSrc?: string;
  }
}

interface VideoMeta {
  id: string;
  width: number;
  height: number;
  duration: number;
  fps: number;
}

interface VideoCache {
  bitmaps: Map<number, ImageBitmap>;
  inFlight: Map<number, Promise<ImageBitmap | null>>;
  readers: Map<VideoState, number>;
}

interface VideoState {
  meta: VideoMeta | null;
  cv: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  paused: boolean;
  currentTime: number;
  ended: boolean;
  lastDrawnIdx: number;
  dead: boolean;
  objectFit: string;
}

type Vec4 = [number, number, number, number];

const SCHEME = "pup-frame://";
const AHEAD = 10;

const MIRROR_PROPS = [
  "borderRadius",
  "borderTopLeftRadius",
  "borderTopRightRadius",
  "borderBottomLeftRadius",
  "borderBottomRightRadius",
  "transform",
  "transformOrigin",
  "filter",
  "clipPath",
  "boxShadow",
  "opacity",
  "mixBlendMode",
  "mask",
  "zIndex",
  "position",
  "left",
  "top",
  "right",
  "bottom",
] as const;

export function installVideoHook(): void {
  if (window.__pup_video__) return;

  const HVE = HTMLVideoElement.prototype;
  const MEDIA = HTMLMediaElement.prototype;
  const origPause = HVE.pause;
  const ctDesc = Object.getOwnPropertyDescriptor(HVE, "currentTime") || Object.getOwnPropertyDescriptor(MEDIA, "currentTime");
  const pausedDesc = Object.getOwnPropertyDescriptor(HVE, "paused") || Object.getOwnPropertyDescriptor(MEDIA, "paused");
  const endedDesc = Object.getOwnPropertyDescriptor(HVE, "ended") || Object.getOwnPropertyDescriptor(MEDIA, "ended");
  const srcDesc = Object.getOwnPropertyDescriptor(HVE, "src") || Object.getOwnPropertyDescriptor(MEDIA, "src");

  const sessions = new WeakMap<HTMLVideoElement, VideoState>();
  const attaching = new WeakMap<HTMLVideoElement, Promise<VideoState | null>>();
  const lastSnapshot = new WeakMap<HTMLVideoElement, OffscreenCanvas>();
  const caches = new Map<string, VideoCache>();
  let currMs = 0;
  let lastMs = 0;

  function getCache(id: string): VideoCache {
    let c = caches.get(id);
    if (!c) {
      c = { bitmaps: new Map(), inFlight: new Map(), readers: new Map() };
      caches.set(id, c);
    }
    return c;
  }

  function fetchBitmap(state: VideoState, idx: number): Promise<ImageBitmap | null> {
    const c = getCache(state.meta!.id);
    const existing = c.inFlight.get(idx);
    if (existing) return existing;
    const cached = c.bitmaps.get(idx);
    if (cached) return Promise.resolve(cached);
    const p = fetch(SCHEME + "frame?id=" + state.meta!.id + "&idx=" + idx)
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => (b ? createImageBitmap(b) : null))
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

  function ensurePrefetched(state: VideoState, fromIdx: number, count: number) {
    const maxIdx = Math.max(1, Math.round(state.meta!.duration * state.meta!.fps));
    for (let i = fromIdx; i < fromIdx + count; i++) {
      if (i < 1 || i > maxIdx) continue;
      fetchBitmap(state, i);
    }
  }

  function evictOld(c: VideoCache) {
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

  function cssCase(s: string): string {
    return s.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
  }

  function syncOverlay(video: HTMLVideoElement, cv: HTMLCanvasElement) {
    const cs = window.getComputedStyle(video);
    const offsetParent = (video.offsetParent as HTMLElement | null) || document.body;
    const vr = video.getBoundingClientRect();
    const pr = offsetParent.getBoundingClientRect();
    cv.style.position = "absolute";
    cv.style.left = vr.left - pr.left + "px";
    cv.style.top = vr.top - pr.top + "px";
    cv.style.width = vr.width + "px";
    cv.style.height = vr.height + "px";
    for (const p of MIRROR_PROPS) {
      if (p === "position" || p === "left" || p === "top" || p === "right" || p === "bottom") continue;
      const v = cs.getPropertyValue(cssCase(p));
      if (v) cv.style.setProperty(cssCase(p), v);
    }
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(vr.width * dpr));
    const h = Math.max(1, Math.round(vr.height * dpr));
    if (cv.width !== w) cv.width = w;
    if (cv.height !== h) cv.height = h;
  }

  function setupCanvas(video: HTMLVideoElement): HTMLCanvasElement {
    const cv = document.createElement("canvas");
    cv.dataset["pupVideoOverlay"] = "1";
    cv.style.pointerEvents = "none";
    video.style.visibility = "hidden";
    video.muted = true;
    const parent = video.parentNode || document.body;
    parent.insertBefore(cv, video.nextSibling);
    syncOverlay(video, cv);
    const snap = lastSnapshot.get(video);
    if (snap) {
      try {
        cv.getContext("2d")!.drawImage(snap, 0, 0, cv.width, cv.height);
      } catch {}
    }
    return cv;
  }

  function fitRect(srcW: number, srcH: number, dstW: number, dstH: number, fit: string): Vec4 {
    if (fit === "none") return [(dstW - srcW) / 2, (dstH - srcH) / 2, srcW, srcH];
    if (fit === "contain" || fit === "scale-down") {
      const sc = Math.min(dstW / srcW, dstH / srcH);
      const k = fit === "scale-down" ? Math.min(1, sc) : sc;
      const ws = k * srcW;
      const hs = k * srcH;
      return [(dstW - ws) / 2, (dstH - hs) / 2, ws, hs];
    }
    if (fit === "cover") {
      const sc2 = Math.max(dstW / srcW, dstH / srcH);
      const ws2 = sc2 * srcW;
      const hs2 = sc2 * srcH;
      return [(dstW - ws2) / 2, (dstH - hs2) / 2, ws2, hs2];
    }
    return [0, 0, dstW, dstH];
  }

  async function doAttach(video: HTMLVideoElement, state: VideoState, src: string, birthMs: number): Promise<VideoState | null> {
    const fps = Number.parseInt(video.dataset["pupFps"] || "30", 10);
    const res = await fetch(SCHEME + "open?src=" + encodeURIComponent(src) + "&fps=" + fps);
    if (sessions.get(video) !== state) return null;
    if (!res.ok) {
      state.dead = true;
      return null;
    }
    const meta = (await res.json()) as VideoMeta;
    if (sessions.get(video) !== state) return null;
    state.meta = meta;
    state.currentTime = state.paused ? 0 : Math.max(0, (currMs - birthMs) / 1000);
    Object.defineProperty(video, "videoWidth", { value: meta.width, configurable: true });
    Object.defineProperty(video, "videoHeight", { value: meta.height, configurable: true });
    Object.defineProperty(video, "duration", { value: meta.duration, configurable: true });
    Object.defineProperty(video, "readyState", { value: 4, configurable: true });
    ["loadstart", "durationchange", "loadedmetadata", "loadeddata", "canplay", "canplaythrough"].forEach((e) => {
      video.dispatchEvent(new Event(e));
    });
    if (!state.paused) {
      video.dispatchEvent(new Event("play"));
      video.dispatchEvent(new Event("playing"));
    }
    ensurePrefetched(state, 1, AHEAD);
    return state;
  }

  function attach(video: HTMLVideoElement): Promise<VideoState | null> {
    const existing = sessions.get(video);
    if (existing) return Promise.resolve(existing);
    const pending = attaching.get(video);
    if (pending) return pending;
    const src = video.src || video.currentSrc;
    if (!src) return Promise.resolve(null);
    if (/^(blob:|data:|mediastream:)/i.test(src)) return Promise.resolve(null);
    const cv = setupCanvas(video);
    const birthMs = currMs;
    const state: VideoState = {
      meta: null,
      cv,
      ctx: cv.getContext("2d")!,
      paused: !(video.autoplay || !video.paused),
      currentTime: 0,
      ended: false,
      lastDrawnIdx: -1,
      dead: false,
      objectFit: window.getComputedStyle(video).objectFit || "fill",
    };
    sessions.set(video, state);
    const p = doAttach(video, state, src, birthMs).finally(() => {
      attaching.delete(video);
    });
    attaching.set(video, p);
    return p;
  }

  function detach(video: HTMLVideoElement) {
    const state = sessions.get(video);
    if (!state) return;
    if (state.meta) {
      if (state.lastDrawnIdx >= 0) {
        try {
          const snap = new OffscreenCanvas(state.cv.width, state.cv.height);
          snap.getContext("2d")!.drawImage(state.cv, 0, 0);
          lastSnapshot.set(video, snap);
        } catch {}
      }
      const c = caches.get(state.meta.id);
      if (c) {
        c.readers.delete(state);
        if (c.readers.size === 0) {
          c.bitmaps.forEach((bm) => bm.close());
          caches.delete(state.meta.id);
          fetch(SCHEME + "close?id=" + state.meta.id, { keepalive: true });
        }
      }
    }
    state.cv.remove();
    sessions.delete(video);
    attaching.delete(video);
  }

  function resume(video: HTMLVideoElement, state: VideoState) {
    if (!state.paused && !state.ended) return;
    state.paused = false;
    state.ended = false;
    video.dispatchEvent(new Event("play"));
    video.dispatchEvent(new Event("playing"));
  }

  HVE.play = function (this: HTMLVideoElement) {
    const video = this;
    const state = sessions.get(video);
    if (!state) return attach(video).then((s) => { if (s) resume(video, s); });
    resume(video, state);
    return Promise.resolve();
  };
  HVE.pause = function (this: HTMLVideoElement) {
    const state = sessions.get(this);
    if (!state) {
      origPause.call(this);
      return;
    }
    if (!state.paused) {
      state.paused = true;
      this.dispatchEvent(new Event("pause"));
    }
  };
  Object.defineProperty(HVE, "paused", {
    configurable: true,
    get(this: HTMLVideoElement) {
      const s = sessions.get(this);
      return s ? s.paused : pausedDesc!.get!.call(this);
    },
  });
  Object.defineProperty(HVE, "ended", {
    configurable: true,
    get(this: HTMLVideoElement) {
      const s = sessions.get(this);
      return s ? s.ended : endedDesc!.get!.call(this);
    },
  });
  if (ctDesc) {
    Object.defineProperty(HVE, "currentTime", {
      configurable: true,
      get(this: HTMLVideoElement) {
        const s = sessions.get(this);
        return s ? s.currentTime : ctDesc.get!.call(this);
      },
      set(this: HTMLVideoElement, t: number) {
        const s = sessions.get(this);
        if (!s) {
          ctDesc.set!.call(this, t);
          return;
        }
        s.currentTime = Math.max(0, Math.min(t, s.meta!.duration));
        if (s.currentTime < s.meta!.duration) s.ended = false;
        this.dispatchEvent(new Event("seeking"));
        this.dispatchEvent(new Event("seeked"));
        this.dispatchEvent(new Event("timeupdate"));
      },
    });
  }

  function onSrcChange(video: HTMLVideoElement) {
    const src = video.src || video.currentSrc || "";
    if (video.__pupLastSrc === src) return;
    video.__pupLastSrc = src;
    if (sessions.has(video)) detach(video);
    attach(video);
  }
  function scan(root: Element | null) {
    if (!root) return;
    if (root.tagName === "VIDEO") attach(root as HTMLVideoElement);
    if (root.querySelectorAll) root.querySelectorAll("video").forEach((v) => attach(v));
  }
  scan(document.documentElement);
  new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === "attributes" && m.target instanceof HTMLVideoElement && m.attributeName === "src") {
        onSrcChange(m.target);
        continue;
      }
      m.addedNodes.forEach((n) => {
        if (n instanceof Element) scan(n);
      });
      m.removedNodes.forEach((n) => {
        if (n instanceof HTMLVideoElement) detach(n);
      });
    }
  }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["src"] });

  if (srcDesc && srcDesc.set) {
    Object.defineProperty(HVE, "src", {
      configurable: true,
      get: srcDesc.get,
      set(this: HTMLVideoElement, v: string) {
        srcDesc.set!.call(this, v);
        onSrcChange(this);
      },
    });
  }

  async function paint(video: HTMLVideoElement, state: VideoState, idx: number) {
    const c = getCache(state.meta!.id);
    c.readers.set(state, idx);
    let bm = c.bitmaps.get(idx);
    if (!bm) {
      ensurePrefetched(state, idx + 1, AHEAD - 1);
      const fetched = await fetchBitmap(state, idx);
      if (sessions.get(video) !== state) return;
      if (!fetched) return;
      bm = fetched;
    }
    const cv = state.cv;
    const r = fitRect(bm.width, bm.height, cv.width, cv.height, state.objectFit);
    state.ctx.clearRect(0, 0, cv.width, cv.height);
    state.ctx.drawImage(bm, r[0], r[1], r[2], r[3]);
    state.lastDrawnIdx = idx;
    ensurePrefetched(state, idx + 1, AHEAD);
    evictOld(c);
  }

  function advance(timestampMs: number) {
    lastMs = currMs;
    currMs = timestampMs;
    const dt = Math.max(0, currMs - lastMs) / 1000;
    void lastMs;
    const ps: Promise<unknown>[] = [];
    document.querySelectorAll("video").forEach((v) => {
      const state = sessions.get(v as HTMLVideoElement);
      if (!state || state.dead) return;
      syncOverlay(v as HTMLVideoElement, state.cv);
      if (!state.meta) return;
      if (!state.paused && !state.ended) {
        state.currentTime += dt * ((v as HTMLVideoElement).playbackRate || 1);
        if (state.currentTime >= state.meta.duration) {
          if ((v as HTMLVideoElement).loop) {
            state.currentTime = state.currentTime % state.meta.duration;
          } else {
            state.currentTime = state.meta.duration;
            state.paused = true;
            state.ended = true;
            v.dispatchEvent(new Event("ended"));
          }
        } else {
          v.dispatchEvent(new Event("timeupdate"));
        }
      }
      const idx = Math.max(1, Math.round(state.currentTime * state.meta.fps));
      if (idx === state.lastDrawnIdx) return;
      ps.push(paint(v as HTMLVideoElement, state, idx));
    });
    return Promise.all(ps);
  }

  window.__pup_video__ = { advance };
}
