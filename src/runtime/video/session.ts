// Created by Autokaka (qq1909698494@gmail.com) on 2026/06/02.

import type { VideoHook } from "./hook";
import {
  AHEAD,
  fire,
  HAVE_ENOUGH_DATA,
  HAVE_METADATA,
  HAVE_NOTHING,
  MEDIA_ERR_DECODE,
  MEDIA_ERR_NETWORK,
  type MediaErrorLike,
  NETWORK_EMPTY,
  NETWORK_IDLE,
  NETWORK_LOADING,
  NETWORK_NO_SOURCE,
  SCHEME,
  TAG,
  type VideoMeta,
  type VideoState,
} from "./types";

export interface AttachArgs {
  video: HTMLVideoElement;
  state: VideoState;
  src: string;
  birthMs: number;
  native: boolean;
}

export function newVideoState(video: HTMLVideoElement, cv: HTMLCanvasElement): VideoState {
  return {
    meta: undefined,
    cv,
    ctx: cv.getContext("2d")!,
    paused: !(video.autoplay || !video.paused),
    currentTime: 0,
    ended: false,
    lastDrawnIdx: -1,
    dead: false,
    objectFit: window.getComputedStyle(video).objectFit || "fill",
    readyState: HAVE_NOTHING,
    networkState: NETWORK_EMPTY,
    seeking: false,
    waiting: false,
    error: undefined,
    presentedFrames: 0,
    maxReached: 0,
    rvfc: new Map(),
  };
}

function failOpen(video: HTMLVideoElement, state: VideoState, error: MediaErrorLike): undefined {
  state.dead = true;
  state.error = error;
  state.networkState = NETWORK_NO_SOURCE;
  console.error(TAG, `${error.message} src=${video.src || video.currentSrc}`);
  fire(video, "error");
  return undefined;
}

// Open the frame server session, then emit the HTMLMediaElement load sequence (readyState/networkState + events).
export async function openSession(hook: VideoHook, args: AttachArgs): Promise<VideoState | undefined> {
  const { video, state, src, birthMs, native } = args;
  const fps = Number.parseInt(video.dataset["pupFps"] || "30", 10);
  state.networkState = NETWORK_LOADING;
  fire(video, "loadstart");
  let res: Response;
  try {
    const q = native ? "" : `&w=${state.cv.width}&h=${state.cv.height}&fit=${encodeURIComponent(state.objectFit)}`;
    res = await fetch(`${SCHEME}open?src=${encodeURIComponent(src)}&fps=${fps}${q}`);
  } catch (e) {
    return failOpen(video, state, {
      code: MEDIA_ERR_NETWORK,
      message: `open failed: ${e instanceof Error ? e.message : String(e)}`,
    });
  }
  if (hook.sessions.get(video) !== state) {
    return undefined;
  }
  if (!res.ok) {
    return failOpen(video, state, {
      code: MEDIA_ERR_DECODE,
      message: `open ${res.status}: ${await res.text()}`,
    });
  }
  const meta = (await res.json()) as VideoMeta;
  if (hook.sessions.get(video) !== state) {
    return undefined;
  }
  state.meta = meta;
  state.currentTime = state.paused ? 0 : Math.max(0, (hook.currMs - birthMs) / 1000);
  // The stub media usually loads natively first; Blink then owns the real event sequence — don't duplicate it.
  const nativeMeta = video.videoWidth > 0;
  Object.defineProperty(video, "videoWidth", {
    value: meta.width,
    configurable: true,
  });
  Object.defineProperty(video, "videoHeight", {
    value: meta.height,
    configurable: true,
  });
  Object.defineProperty(video, "duration", {
    value: meta.duration,
    configurable: true,
  });
  state.readyState = HAVE_METADATA;
  if (!nativeMeta) {
    fire(video, "durationchange");
    fire(video, "loadedmetadata");
  }
  state.readyState = HAVE_ENOUGH_DATA;
  if (!nativeMeta) {
    fire(video, "loadeddata");
    fire(video, "canplay");
    fire(video, "canplaythrough");
  }
  state.networkState = NETWORK_IDLE;
  if (!nativeMeta) {
    fire(video, "suspend");
    if (!state.paused) {
      fire(video, "play");
      fire(video, "playing");
    }
  }
  hook.cache.prefetch(state, 1, AHEAD);
  return state;
}
