// Created by Autokaka (qq1909698494@gmail.com) on 2026/06/02.

import type { VideoHook } from "./hook";
import { fitRect, syncOverlay } from "./overlay";
import { AHEAD, fire, type VideoFrameMeta, type VideoState } from "./types";

function fireFrameCallbacks(state: VideoState): void {
  if (state.rvfc.size === 0) return;
  const cbs = [...state.rvfc.values()];
  state.rvfc.clear();
  const now = performance.now();
  const meta: VideoFrameMeta = {
    presentationTime: now,
    expectedDisplayTime: now,
    width: state.meta!.frameWidth,
    height: state.meta!.frameHeight,
    mediaTime: state.currentTime,
    presentedFrames: state.presentedFrames,
  };
  for (const cb of cbs) cb(now, meta);
}

async function paint(hook: VideoHook, video: HTMLVideoElement, state: VideoState, idx: number): Promise<void> {
  const c = hook.cache.cacheOf(state.meta!.id);
  c.readers.set(state, idx);
  let bm = c.bitmaps.get(idx);
  if (!bm) {
    hook.cache.prefetch(state, idx + 1, AHEAD - 1);
    const fetched = await hook.cache.fetch(state, idx);
    if (hook.sessions.get(video) !== state) return;
    if (!fetched) {
      if (!state.paused && !state.waiting) {
        state.waiting = true;
        fire(video, "waiting");
      }
      return;
    }
    bm = fetched;
  }
  if (state.waiting) {
    state.waiting = false;
    if (!state.paused) fire(video, "playing");
  }
  const cv = state.cv;
  const r = fitRect(bm.width, bm.height, cv.width, cv.height, state.objectFit);
  state.ctx.clearRect(0, 0, cv.width, cv.height);
  state.ctx.drawImage(bm, r[0], r[1], r[2], r[3]);
  state.lastDrawnIdx = idx;
  state.presentedFrames++;
  fireFrameCallbacks(state);
  hook.cache.prefetch(state, idx + 1, AHEAD);
  hook.cache.evict(c);
}

// Virtual-time tick: sync overlays, advance each hooked video's clock (loop/end), paint the due frame.
export function advance(hook: VideoHook, timestampMs: number): Promise<unknown> {
  const dt = Math.max(0, timestampMs - hook.currMs) / 1000;
  hook.currMs = timestampMs;
  const ps: Promise<unknown>[] = [];
  document.querySelectorAll("video").forEach((el) => {
    const video = el as HTMLVideoElement;
    const state = hook.sessions.get(video);
    if (!state || state.dead) return;
    syncOverlay(video, state.cv);
    if (!state.meta) return;
    // Element grew past the decoded (downscaled) res → re-decode at native, one-shot (covers zoom).
    if (
      state.meta.frameWidth < state.meta.width &&
      state.cv.width > state.meta.frameWidth * 1.05 &&
      !hook.attaching.has(video)
    ) {
      hook.reattach(video, state);
      return;
    }
    if (!state.paused && !state.ended) {
      state.currentTime += dt * (video.playbackRate || 1);
      state.maxReached = Math.max(state.maxReached, state.currentTime);
      if (state.currentTime >= state.meta.duration) {
        if (video.loop) {
          state.currentTime = state.currentTime % state.meta.duration;
        } else {
          state.currentTime = state.meta.duration;
          state.paused = true;
          state.ended = true;
          fire(video, "ended");
        }
      } else {
        fire(video, "timeupdate");
      }
    }
    const idx = Math.max(1, Math.round(state.currentTime * state.meta.fps));
    if (idx === state.lastDrawnIdx) return;
    ps.push(paint(hook, video, state, idx));
  });
  return Promise.all(ps);
}
