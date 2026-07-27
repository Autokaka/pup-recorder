declare global {
  interface Window {
    __pup_tick__?: { process: (ms: number) => void };
  }
}

interface Timer {
  type: "timeout" | "interval";
  cb: TimerHandler;
  delay: number;
  next: number;
}

interface RafEntry {
  id: number;
  cb: FrameRequestCallback;
}

interface AnimEntry {
  startMs: number;
  adopted: boolean;
}

export function installTickHook(): void {
  if (window.__pup_tick__) {
    return;
  }

  const REAL_DATE = Date;
  const dateOrigin = REAL_DATE.now();
  let currMs = 0;
  let timeOffset = 0;
  let rafQueue: RafEntry[] = [];
  const timers: Record<number, Timer | undefined> = {};
  let nextId = 1;
  const tick = () => {
    timeOffset += 0.01;
    return timeOffset;
  };

  function FakeDate(this: unknown, ...args: unknown[]): Date | string {
    if (!(this instanceof FakeDate)) {
      return new REAL_DATE(dateOrigin + currMs).toString();
    }
    return args.length
      ? new (Function.prototype.bind.apply(REAL_DATE, [null, ...args]))()
      : new REAL_DATE(dateOrigin + currMs + tick());
  }
  FakeDate.prototype = REAL_DATE.prototype;
  FakeDate.now = () => dateOrigin + currMs + tick();
  FakeDate.parse = REAL_DATE.parse;
  FakeDate.UTC = REAL_DATE.UTC;
  (window as unknown as { Date: unknown }).Date = FakeDate;
  performance.now = () => currMs + tick();

  window.requestAnimationFrame = (cb) => {
    const id = nextId++;
    rafQueue.push({ id, cb });
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    rafQueue = rafQueue.filter((r) => r.id !== id);
  };
  (window as unknown as { setTimeout: unknown }).setTimeout = (cb: TimerHandler, delay?: number) => {
    const id = nextId++;
    timers[id] = { type: "timeout", cb, delay: delay || 0, next: currMs + (delay || 0) };
    return id;
  };
  window.clearTimeout = (id) => {
    if (typeof id === "number") {
      delete timers[id];
    }
  };
  (window as unknown as { setInterval: unknown }).setInterval = (cb: TimerHandler, delay?: number) => {
    const id = nextId++;
    const d = Math.max(delay || 0, 1);
    timers[id] = { type: "interval", cb, delay: d, next: currMs + d };
    return id;
  };
  window.clearInterval = (id) => {
    if (typeof id === "number") {
      delete timers[id];
    }
  };

  function safeInvokeTimer(fn: TimerHandler) {
    try {
      if (typeof fn === "string") {
        // String timer handler runs as page script in global scope (HTML spec); Function ctor matches that, avoids eval.
        new Function(fn)();
      } else {
        fn();
      }
    } catch (e) {
      console.error("[Tick] error:", (e instanceof Error && e.stack) || e);
    }
  }
  function safeInvokeRaf(cb: FrameRequestCallback, ts: number) {
    try {
      cb(ts);
    } catch (e) {
      console.error("[Tick] error:", (e instanceof Error && e.stack) || e);
    }
  }

  const animState = new WeakMap<Animation, AnimEntry>();
  function endBoundary(a: Animation): number | undefined {
    try {
      const t = a.effect?.getComputedTiming().endTime;
      return typeof t === "number" && Number.isFinite(t) ? t : undefined;
    } catch {
      // Detached/foreign effects have no timing; treat as unbounded.
      return undefined;
    }
  }
  // Adopt running animations (pause + drive currentTime off the virtual clock): an infinite compositor animation otherwise keeps viz free-running at RENDER_FPS, starving CDP evals.
  function syncAnimations(ms: number) {
    let anims: Animation[];
    try {
      anims = document.getAnimations();
    } catch {
      return;
    }
    for (const a of anims) {
      const state = a.playState;
      if (state === "idle" || state === "finished") {
        animState.delete(a);
        continue;
      }
      const rate = typeof a.playbackRate === "number" ? a.playbackRate : 1;
      if (rate === 0) {
        continue;
      }
      let s = animState.get(a);
      if (!s) {
        const ct0 = typeof a.currentTime === "number" ? a.currentTime : 0;
        s = { startMs: ms - ct0 / rate, adopted: state !== "paused" };
        animState.set(a, s);
        if (s.adopted) {
          try {
            a.pause();
          } catch {
            // Pause-rejecting states (e.g. mid-cancel) still accept currentTime writes below.
          }
        }
      } else if (!s.adopted && state !== "paused") {
        const ct = typeof a.currentTime === "number" ? a.currentTime : 0;
        s.startMs = ms - ct / rate;
        s.adopted = true;
        try {
          a.pause();
        } catch {
          // Same as adoption above: drive by currentTime regardless.
        }
      }
      if (!s.adopted) {
        continue;
      }
      const target = (ms - s.startMs) * rate;
      const end = endBoundary(a);
      // finish() seeks to the rate-appropriate boundary and applies fill mode; paused holds would misrender fill:none.
      if (rate > 0 ? end !== undefined && target >= end : target <= 0) {
        animState.delete(a);
        try {
          a.finish();
        } catch {
          // Infinite-duration reverse or detached effect: leave as-is.
        }
        continue;
      }
      a.currentTime = target;
    }
  }

  function process(timestampMs: number) {
    currMs = timestampMs;
    timeOffset = 0;
    for (const id of Object.keys(timers)) {
      const t = timers[Number(id)];
      if (!t) {
        continue;
      }
      while (t.next <= currMs) {
        safeInvokeTimer(t.cb);
        if (t.type === "timeout") {
          delete timers[Number(id)];
          break;
        }
        t.next += t.delay;
      }
    }
    const rafs = rafQueue.splice(0);
    for (const r of rafs) {
      safeInvokeRaf(r.cb, currMs);
    }
    syncAnimations(currMs);
  }

  window.__pup_tick__ = { process };
}
