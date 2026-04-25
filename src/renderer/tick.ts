// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/01.

import type { WebFrameMain } from "electron";
import { logger } from "../base/logging";
import { withTimeout } from "../base/timing";

export const TICK_SYMBOL = "__pup_tick__";
const TAG = `[Tick]`;

const HOOK = `(function() {
  if (window.self === window.top) return;
  if (typeof ${TICK_SYMBOL} !== 'undefined') return;

  const orig = {
    Date: Date,
    dateNow: Date.now.bind(Date),
    performanceNow: performance.now.bind(performance),
    raf: requestAnimationFrame.bind(window),
    caf: cancelAnimationFrame.bind(window),
    setTimeout: setTimeout.bind(window),
    clearTimeout: clearTimeout.bind(window),
    setInterval: setInterval.bind(window),
    clearInterval: clearInterval.bind(window),
  };

  let currMs = 0;
  let rafQueue = [];
  const timers = {};
  let nextId = 1;
  const dateOrigin = new orig.Date();
  const perfOrigin = orig.performanceNow();

  performance.now = function() { return perfOrigin + currMs; };
  Date.now = function() { return dateOrigin.getTime() + currMs; };
  Date = function() {
    var O = orig.Date;
    if (arguments.length === 0) return new O(dateOrigin.getTime() + currMs);
    return new (Function.prototype.bind.apply(O, [null].concat(Array.prototype.slice.call(arguments))))();
  };
  Date.now = function() { return dateOrigin.getTime() + currMs; };
  Date.parse = orig.Date.parse;
  Date.UTC = orig.Date.UTC;
  Date.prototype = orig.Date.prototype;

  window.requestAnimationFrame = function(cb) {
    const id = nextId++;
    rafQueue.push({ id, cb });
    return id;
  };
  window.cancelAnimationFrame = function(id) {
    rafQueue = rafQueue.filter((r) => r.id !== id);
  };

  window.setTimeout = function(cb, delay, ...args) {
    const id = nextId++;
    timers[id] = { type: 'timeout', cb, delay: delay || 0, next: currMs + (delay || 0), args };
    return id;
  };
  window.clearTimeout = function(id) { delete timers[id]; };

  window.setInterval = function(cb, delay, ...args) {
    const id = nextId++;
    const d = Math.max(delay || 0, 1);
    timers[id] = { type: 'interval', cb, delay: d, next: currMs + d, args };
    return id;
  };
  window.clearInterval = function(id) { delete timers[id]; };

  function process(timestampMs) {
    currMs = timestampMs;
    document.getAnimations().forEach(a => {
      a.pause();
      a.currentTime = currMs;
    });
    const ids = Object.keys(timers);
    for (let i = 0; i < ids.length; i++) {
      const t = timers[ids[i]];
      if (!t) continue;
      while (t.next <= currMs) {
        if (typeof t.cb === 'string') eval(t.cb); else t.cb.apply(undefined, t.args);
        if (t.type === 'timeout') { delete timers[ids[i]]; break; }
        t.next += t.delay;
      }
    }
    const rafs = rafQueue.splice(0);
    for (let j = 0; j < rafs.length; j++) {
      rafs[j].cb(currMs);
    }
  }

  function eject() {
    Date = orig.Date;
    performance.now = orig.performanceNow;
    window.requestAnimationFrame = orig.raf;
    window.cancelAnimationFrame = orig.caf;
    window.setTimeout = orig.setTimeout;
    window.clearTimeout = orig.clearTimeout;
    window.setInterval = orig.setInterval;
    window.clearInterval = orig.clearInterval;
    delete window.${TICK_SYMBOL};
  }

  window.${TICK_SYMBOL} = { process: process, eject: eject };
})();`;

export async function tick(frame: WebFrameMain | undefined, timestampMs: number) {
  if (!frame) return;
  try {
    await withTimeout(
      frame.executeJavaScript(`${HOOK} ${TICK_SYMBOL}.process(${timestampMs})`),
      5_000,
      "tick.executeJavaScript",
    );
  } catch (e) {
    // NOTE(Autokaka):
    // Side-effects may throw (e.g. uncaught error on animation callback), ignore to let recorder continue
    // The errors will be dispatched to window console, just like how render.ts works
    logger.error(TAG, "tick failed:", e);
  }
}
