// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/01.

export const TICK_SYMBOL = "__pup_tick__";

/**
 * Builds the JS injector that hooks all time-related globals in the target iframe.
 * Guards against running in the wrapper (top-level) frame so the stego canvas is unaffected.
 * Must be injected via Page.addScriptToEvaluateOnNewDocument AND directly into
 * already-loaded sub-frames.
 */
export function buildTickInjector(): string {
  return `(function() {
  if (window.self === window.top) return;
  if (typeof ${TICK_SYMBOL} !== 'undefined') return;

  const orig = {
    performanceNow: performance.now.bind(performance),
    dateNow: Date.now.bind(Date),
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

  performance.now = function() { return currMs; };
  Date.now = function() { return currMs; };

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
    performance.now = orig.performanceNow;
    Date.now = orig.dateNow;
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
}

export function doProcess(timestampMs: number): string {
  return `${TICK_SYMBOL}.process(${timestampMs})`;
}

export function doEject(): string {
  return `if (typeof ${TICK_SYMBOL} !== 'undefined') ${TICK_SYMBOL}.eject()`;
}
