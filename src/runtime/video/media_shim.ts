// Created by Autokaka (qq1909698494@gmail.com) on 2026/06/02.

import type { VideoHook } from "./hook";
import { type FrameCb, fire, timeRanges, type VideoState } from "./types";

// Override the HTMLMediaElement surface for hooked <video>; unhooked elements fall through to native.
export function installMediaShim(hook: VideoHook): void {
  const HVE = HTMLVideoElement.prototype;
  const MEDIA = HTMLMediaElement.prototype;
  const mdesc = (p: string) => Object.getOwnPropertyDescriptor(HVE, p) || Object.getOwnPropertyDescriptor(MEDIA, p);
  const ctDesc = mdesc("currentTime");
  const srcDesc = mdesc("src");
  const rateDesc = mdesc("playbackRate");
  const origPause = HVE.pause;
  const origRVFC = HVE.requestVideoFrameCallback;
  const origCancelRVFC = HVE.cancelVideoFrameCallback;
  const origQuality = HVE.getVideoPlaybackQuality;
  const origLoad = HVE.load;
  const sessions = hook.sessions;

  // Session-backed read-only property with native fallback when the element isn't hooked.
  const def = (prop: string, pick: (s: VideoState) => unknown) => {
    const nativeGet = mdesc(prop)?.get;
    if (!nativeGet) {
      throw new Error(`media_shim: no native getter for ${prop}`);
    }
    Object.defineProperty(HVE, prop, {
      configurable: true,
      get(this: HTMLVideoElement) {
        const s = sessions.get(this);
        return s ? pick(s) : nativeGet.call(this);
      },
    });
  };
  def("paused", (s) => s.paused);
  def("ended", (s) => s.ended);
  def("readyState", (s) => s.readyState);
  def("networkState", (s) => s.networkState);
  def("error", (s) => s.error ?? null);
  def("seeking", (s) => s.seeking);
  def("buffered", (s) => timeRanges(s.meta ? s.meta.duration : 0));
  def("seekable", (s) => timeRanges(s.meta ? s.meta.duration : 0));
  def("played", (s) => timeRanges(s.maxReached));

  HVE.play = function (this: HTMLVideoElement) {
    const s = sessions.get(this);
    if (!s) {
      return hook.attach(this).then((ns) => {
        if (ns) {
          hook.resume(this, ns);
        }
      });
    }
    hook.resume(this, s);
    return Promise.resolve();
  };
  HVE.pause = function (this: HTMLVideoElement) {
    const s = sessions.get(this);
    if (!s) {
      origPause.call(this);
      return;
    }
    if (!s.paused) {
      s.paused = true;
      fire(this, "pause");
    }
  };
  if (ctDesc?.get && ctDesc.set) {
    const ctGet = ctDesc.get;
    const ctSet = ctDesc.set;
    Object.defineProperty(HVE, "currentTime", {
      configurable: true,
      get(this: HTMLVideoElement) {
        const s = sessions.get(this);
        return s ? s.currentTime : ctGet.call(this);
      },
      set(this: HTMLVideoElement, t: number) {
        const s = sessions.get(this);
        if (!s) {
          ctSet.call(this, t);
          return;
        }
        const dur = s.meta ? s.meta.duration : t;
        s.currentTime = Math.max(0, Math.min(t, dur));
        s.maxReached = Math.max(s.maxReached, s.currentTime);
        if (s.currentTime < dur) {
          s.ended = false;
        }
        s.seeking = true;
        fire(this, "seeking");
        s.seeking = false;
        fire(this, "seeked");
        fire(this, "timeupdate");
      },
    });
  }
  if (rateDesc?.set) {
    const rateSet = rateDesc.set;
    Object.defineProperty(HVE, "playbackRate", {
      configurable: true,
      get: rateDesc.get,
      set(this: HTMLVideoElement, r: number) {
        rateSet.call(this, r);
        if (sessions.has(this)) {
          fire(this, "ratechange");
        }
      },
    });
  }
  HVE.requestVideoFrameCallback = function (this: HTMLVideoElement, cb): number {
    const s = sessions.get(this);
    if (!s) {
      return origRVFC.call(this, cb);
    }
    const id = ++hook.rvfcSeq;
    s.rvfc.set(id, cb as FrameCb);
    return id;
  };
  HVE.cancelVideoFrameCallback = function (this: HTMLVideoElement, id: number): void {
    const s = sessions.get(this);
    if (!s) {
      origCancelRVFC.call(this, id);
      return;
    }
    s.rvfc.delete(id);
  };
  HVE.getVideoPlaybackQuality = function (this: HTMLVideoElement) {
    const s = sessions.get(this);
    if (!s) {
      return origQuality.call(this);
    }
    return {
      creationTime: performance.now(),
      totalVideoFrames: s.presentedFrames,
      droppedVideoFrames: 0,
      corruptedVideoFrames: 0,
    } as VideoPlaybackQuality;
  };
  HVE.load = function (this: HTMLVideoElement) {
    if (!sessions.has(this)) {
      return origLoad.call(this);
    }
    hook.detach(this);
    fire(this, "emptied");
    this.__pupLastSrc = undefined;
    hook.attach(this);
  };
  if (srcDesc?.set) {
    const srcSet = srcDesc.set;
    Object.defineProperty(HVE, "src", {
      configurable: true,
      get: srcDesc.get,
      set(this: HTMLVideoElement, v: string) {
        srcSet.call(this, v);
        hook.onSrcChange(this);
      },
    });
  }
}
