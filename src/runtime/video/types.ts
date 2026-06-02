// Created by Autokaka (qq1909698494@gmail.com) on 2026/06/02.

export const SCHEME = "pup-frame://";
export const AHEAD = 10;
export const TAG = "[VideoHook]";

export const MEDIA_ERR_NETWORK = 2;
export const MEDIA_ERR_DECODE = 3;
export const HAVE_NOTHING = 0;
export const HAVE_METADATA = 1;
export const HAVE_ENOUGH_DATA = 4;
export const NETWORK_EMPTY = 0;
export const NETWORK_IDLE = 1;
export const NETWORK_LOADING = 2;
export const NETWORK_NO_SOURCE = 3;

export interface VideoMeta {
  id: string;
  width: number;
  height: number;
  frameWidth: number;
  frameHeight: number;
  duration: number;
  fps: number;
}

export interface VideoFrameMeta {
  presentationTime: number;
  expectedDisplayTime: number;
  width: number;
  height: number;
  mediaTime: number;
  presentedFrames: number;
}

export type FrameCb = (now: number, meta: VideoFrameMeta) => void;

export interface MediaErrorLike {
  code: number;
  message: string;
}

export interface VideoCache {
  bitmaps: Map<number, ImageBitmap>;
  inFlight: Map<number, Promise<ImageBitmap | null>>;
  readers: Map<VideoState, number>;
}

export interface VideoState {
  meta: VideoMeta | null;
  cv: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  paused: boolean;
  currentTime: number;
  ended: boolean;
  lastDrawnIdx: number;
  dead: boolean;
  objectFit: string;
  readyState: number;
  networkState: number;
  seeking: boolean;
  waiting: boolean;
  error: MediaErrorLike | undefined;
  presentedFrames: number;
  maxReached: number;
  rvfc: Map<number, FrameCb>;
}

export interface TimeRangesLike {
  length: number;
  start(i: number): number;
  end(i: number): number;
}

// Whole clip is decode-on-demand, so the available range is always [0, end] (one TimeRanges entry).
export function timeRanges(end: number): TimeRangesLike {
  return { length: end > 0 ? 1 : 0, start: () => 0, end: () => end };
}

export function fire(el: EventTarget, type: string): void {
  el.dispatchEvent(new Event(type));
}
