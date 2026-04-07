// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/01.

export const TICK_SYMBOL = "__pup_tick__";

export interface TickInjectorOptions {
  /**
   * When true, skips the top-frame guard so the injector runs in the main document.
   * Required for Puppeteer mode where the page is loaded directly (no stego iframe wrapper).
   * Default: false (Electron/stego mode — only inject in iframes).
   */
  skipFrameGuard?: boolean;
}

/**
 * Builds the JS injector that hooks all time-related globals in the target frame.
 * In Electron/stego mode (default), guards against running in the top-level frame.
 * In Puppeteer mode (skipFrameGuard: true), injects directly into the main document.
 * Must be injected via Page.addScriptToEvaluateOnNewDocument AND directly into
 * already-loaded frames.
 */
export function buildTickInjector(opts?: TickInjectorOptions): string {
  const frameGuard = opts?.skipFrameGuard ? "" : "if (window.self === window.top) return;";
  return `(function() {
  ${frameGuard}
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
}

export function doProcess(timestampMs: number): string {
  return `${TICK_SYMBOL}.process(${timestampMs})`;
}

export function doEject(): string {
  return `if (typeof ${TICK_SYMBOL} !== 'undefined') ${TICK_SYMBOL}.eject()`;
}
