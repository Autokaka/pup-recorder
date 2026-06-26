// Created by Autokaka (qq1909698494@gmail.com) on 2026/06/02.

type Vec4 = [number, number, number, number];

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

function cssCase(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

// Track the overlay canvas to the video element's live box (position, size×dpr, mirrored visual styles).
export function syncOverlay(video: HTMLVideoElement, cv: HTMLCanvasElement): void {
  const cs = window.getComputedStyle(video);
  cv.style.position = "absolute";
  // offset* are pre-transform coords from offsetParent's padding edge = the abs containing-block origin; map direct.
  cv.style.left = `${video.offsetLeft}px`;
  cv.style.top = `${video.offsetTop}px`;
  cv.style.width = `${video.offsetWidth}px`;
  cv.style.height = `${video.offsetHeight}px`;
  for (const p of MIRROR_PROPS) {
    if (p === "position" || p === "left" || p === "top" || p === "right" || p === "bottom") {
      continue;
    }
    const v = cs.getPropertyValue(cssCase(p));
    if (v) {
      cv.style.setProperty(cssCase(p), v);
    }
  }
  // Backing store at on-screen pixel size (post-transform) so decode resolution matches displayed pixels.
  const vr = video.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(1, Math.round(vr.width * dpr));
  const h = Math.max(1, Math.round(vr.height * dpr));
  if (cv.width !== w) {
    cv.width = w;
  }
  if (cv.height !== h) {
    cv.height = h;
  }
}

export function setupCanvas(video: HTMLVideoElement, snap: OffscreenCanvas | undefined): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.dataset["pupVideoOverlay"] = "1";
  cv.style.pointerEvents = "none";
  video.style.visibility = "hidden";
  video.muted = true;
  const parent = video.parentNode || document.body;
  parent.insertBefore(cv, video.nextSibling);
  syncOverlay(video, cv);
  if (snap) {
    try {
      cv.getContext("2d")!.drawImage(snap, 0, 0, cv.width, cv.height);
    } catch {}
  }
  return cv;
}

// Draw rect for the bitmap within the canvas per objectFit.
export function fitRect(srcW: number, srcH: number, dstW: number, dstH: number, fit: string): Vec4 {
  if (fit === "none") {
    return [(dstW - srcW) / 2, (dstH - srcH) / 2, srcW, srcH];
  }
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
