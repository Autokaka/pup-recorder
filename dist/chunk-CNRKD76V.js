import 'source-map-support/register.js';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { spawn } from 'child_process';
import z from 'zod';
import { readdir, readFile } from 'fs/promises';
import electron from 'electron';
import { platform } from 'os';
import { graphics } from 'systeminformation';

var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __knownSymbol = (name, symbol) => (symbol = Symbol[name]) ? symbol : /* @__PURE__ */ Symbol.for("Symbol." + name);
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __decoratorStart = (base) => [, , , __create(null)];
var __decoratorStrings = ["class", "method", "getter", "setter", "accessor", "field", "value", "get", "set"];
var __expectFn = (fn) => fn !== void 0 && typeof fn !== "function" ? __typeError("Function expected") : fn;
var __decoratorContext = (kind, name, done, metadata, fns) => ({ kind: __decoratorStrings[kind], name, metadata, addInitializer: (fn) => done._ ? __typeError("Already initialized") : fns.push(__expectFn(fn || null)) });
var __decoratorMetadata = (array, target) => __defNormalProp(target, __knownSymbol("metadata"), array[3]);
var __runInitializers = (array, flags, self, value) => {
  for (var i = 0, fns = array[flags >> 1], n = fns && fns.length; i < n; i++) fns[i].call(self) ;
  return value;
};
var __decorateElement = (array, flags, name, decorators, target, extra) => {
  var it, done, ctx, access, k = flags & 7, s = false, p = false;
  var j = 2 , key = __decoratorStrings[k + 5];
  var extraInitializers = array[j] || (array[j] = []);
  var desc = ((target = target.prototype), __getOwnPropDesc(target , name));
  for (var i = decorators.length - 1; i >= 0; i--) {
    ctx = __decoratorContext(k, name, done = {}, array[3], extraInitializers);
    {
      ctx.static = s, ctx.private = p, access = ctx.access = { has: (x) => name in x };
      access.get = (x) => x[name];
    }
    it = (0, decorators[i])(desc[key]  , ctx), done._ = 1;
    __expectFn(it) && (desc[key] = it );
  }
  return desc && __defProp(target, name, desc), target;
};
var __publicField = (obj, key, value) => __defNormalProp(obj, key + "" , value);
var __using = (stack, value, async) => {
  if (value != null) {
    if (typeof value !== "object" && typeof value !== "function") __typeError("Object expected");
    var dispose, inner;
    if (async) dispose = value[__knownSymbol("asyncDispose")];
    if (dispose === void 0) {
      dispose = value[__knownSymbol("dispose")];
      if (async) inner = dispose;
    }
    if (typeof dispose !== "function") __typeError("Object not disposable");
    if (inner) dispose = function() {
      try {
        inner.call(this);
      } catch (e) {
        return Promise.reject(e);
      }
    };
    stack.push([async, dispose, value]);
  } else if (async) {
    stack.push([async]);
  }
  return value;
};
var __callDispose = (stack, error, hasError) => {
  var E = typeof SuppressedError === "function" ? SuppressedError : function(e, s, m, _) {
    return _ = Error(m), _.name = "SuppressedError", _.error = e, _.suppressed = s, _;
  };
  var fail = (e) => error = hasError ? new E(e, error, "An error was suppressed during disposal") : (hasError = true, e);
  var next = (it) => {
    while (it = stack.pop()) {
      try {
        var result = it[1] && it[1].call(it[2]);
        if (it[0]) return Promise.resolve(result).then(next, (e) => (fail(e), next()));
      } catch (e) {
        fail(e);
      }
    }
    if (hasError) throw error;
  };
  return next();
};

// src/base/env.ts
function penv(name, parser, defaultValue) {
  try {
    return parser(process.env[name]);
  } catch {
    return defaultValue;
  }
}

// src/base/parser.ts
function parseNumber(x) {
  if (typeof x === "number") {
    return x;
  }
  const num = Number(x);
  if (Number.isNaN(num)) {
    throw new Error(`Value ${x} is not a valid number`);
  }
  return num;
}
function parseString(x) {
  if (typeof x === "string") return x;
  return String(x);
}
var require2 = createRequire(import.meta.url);
var env = process.env;
var pupLogLevel = penv("PUP_LOG_LEVEL", parseNumber, 2);
var pupUseInnerProxy = env["PUP_USE_INNER_PROXY"] === "1";
var pupDisableGPU = env["PUP_DISABLE_GPU"] === "1";
var pupPkgRoot = dirname(require2.resolve("pup-recorder/package.json"));
var pupApp = join(pupPkgRoot, "dist", "app.cjs");

// src/base/logging.ts
var DEBUG = "<pup@debug>";
var INFO = "<pup@info>";
var WARN = "<pup@warn>";
var ERROR = "<pup@error>";
var FATAL = "<pup@fatal>";
function stackHook(target, _context) {
  return function(...messages) {
    const processed = messages.map((msg) => {
      return msg instanceof Error ? msg.stack ?? String(msg) : msg;
    });
    return target.call(this, ...processed);
  };
}
var _fatal_dec, _error_dec, _warn_dec, _info_dec, _debug_dec, _init;
_debug_dec = [stackHook], _info_dec = [stackHook], _warn_dec = [stackHook], _error_dec = [stackHook], _fatal_dec = [stackHook];
var Logger = class {
  constructor(_level = pupLogLevel) {
    this._level = _level;
    __runInitializers(_init, 5, this);
    __publicField(this, "_impl");
    this.impl = console;
  }
  get level() {
    return this._level;
  }
  set level(value) {
    this._level = value;
    this.impl = this._impl ?? console;
  }
  get impl() {
    return this._impl;
  }
  set impl(value) {
    const debug = value.debug ?? console.debug;
    const info = value.info ?? console.info;
    const warn = value.warn ?? console.warn;
    const error = value.error ?? console.error;
    const lv = this._level;
    this._impl = {
      debug: lv >= 3 ? debug : void 0,
      info: lv >= 2 ? info : void 0,
      warn: lv >= 1 ? warn : void 0,
      error: lv >= 0 ? error : void 0
    };
  }
  debug(...messages) {
    this.impl?.debug?.(DEBUG, ...messages);
  }
  info(...messages) {
    this.impl?.info?.(INFO, ...messages);
  }
  warn(...messages) {
    this.impl?.warn?.(WARN, ...messages);
  }
  error(...messages) {
    this.impl?.error?.(ERROR, ...messages);
  }
  fatal(...messages) {
    this.impl?.error?.(FATAL, ...messages);
    process.exit(1);
  }
  dispatch(message) {
    if (message.startsWith(DEBUG)) {
      this.debug(message.slice(DEBUG.length + 1));
    } else if (message.startsWith(INFO)) {
      this.info(message.slice(INFO.length + 1));
    } else if (message.startsWith(WARN)) {
      this.warn(message.slice(WARN.length + 1));
    } else if (message.startsWith(ERROR)) {
      this.error(message.slice(ERROR.length + 1));
    } else {
      this.info(message);
    }
  }
  attach(proc, name) {
    return new Promise((resolve, reject) => {
      this.debug(`${name}.attach`);
      let fatal = "";
      const dispatch = (data) => {
        const message = data.toString();
        if (message.startsWith(FATAL)) {
          fatal += message.slice(FATAL.length + 1);
        } else {
          this.dispatch(message);
        }
      };
      proc.stderr?.on("data", dispatch);
      proc.stdout?.on("data", dispatch);
      proc.on("message", dispatch).on("error", (err) => {
        fatal += err.message;
        proc.kill();
      }).once("close", (code, signal) => {
        if (code || signal || fatal) {
          fatal ||= `command failed: ${proc.spawnargs.join(" ")}`;
          this.debug(`${name}.close`, { code, signal, fatal });
          reject(new Error(fatal));
        } else {
          this.debug(`${name}.close`);
          resolve();
        }
      }).on("unhandledRejection", (reason) => {
        this.error(`${name}.unhandled`, reason);
      }).on("uncaughtExceptionMonitor", (err) => {
        this.error(`${name}.unhandled`, err);
      });
    });
  }
};
_init = __decoratorStart();
__decorateElement(_init, 1, "debug", _debug_dec, Logger);
__decorateElement(_init, 1, "info", _info_dec, Logger);
__decorateElement(_init, 1, "warn", _warn_dec, Logger);
__decorateElement(_init, 1, "error", _error_dec, Logger);
__decorateElement(_init, 1, "fatal", _fatal_dec, Logger);
__decoratorMetadata(_init, Logger);
var logger = new Logger();

// src/base/noerr.ts
function noerr(fn, defaultValue) {
  return (...args) => {
    try {
      const ret = fn(...args);
      if (ret instanceof Promise) {
        return ret.catch(() => defaultValue);
      }
      return ret;
    } catch {
      return defaultValue;
    }
  };
}
var PUP_ARGS_KEY = "--pup-priv-args";
function pargs() {
  const argv = process.argv;
  let priv = argv.find((arg) => arg.startsWith(PUP_ARGS_KEY));
  if (!priv) {
    logger.debug("procargv", argv);
    return process.argv;
  }
  const args = ["exec", ...argv.slice(-1)];
  priv = Buffer.from(priv.split("=")[1], "base64").toString();
  args.push(...JSON.parse(priv));
  logger.debug("pupargs", args);
  return args;
}
function exec(cmd, options) {
  const parts = cmd.split(" ").filter((s) => s.length);
  const [command, ...args] = parts;
  if (!command) throw new Error("empty command");
  const proc = spawn(command, args, {
    stdio: "inherit",
    ...options
  });
  return { process: proc, wait: logger.attach(proc, command) };
}
var DEFAULT_WIDTH = 1920;
var DEFAULT_HEIGHT = 1080;
var DEFAULT_FPS = 30;
var DEFAULT_DURATION = 5;
var DEFAULT_OUT_DIR = "out";
var VIDEO_FORMATS = ["mp4", "webm"];
function isVideoFormat(s) {
  return VIDEO_FORMATS.includes(s);
}
var RenderSchema = z.object({
  duration: z.number().optional().default(DEFAULT_DURATION).describe("Duration in seconds"),
  width: z.number().optional().default(DEFAULT_WIDTH).describe("Video width"),
  height: z.number().optional().default(DEFAULT_HEIGHT).describe("Video height"),
  fps: z.number().optional().default(DEFAULT_FPS).describe("Frames per second"),
  formats: z.array(z.enum(VIDEO_FORMATS)).optional().default(["mp4"]).describe(`Output video formats, allow ${VIDEO_FORMATS.join(", ")}`),
  withAudio: z.boolean().optional().default(false).describe("Capture and encode audio"),
  outDir: z.string().optional().default(DEFAULT_OUT_DIR).describe("Output directory"),
  useInnerProxy: z.boolean().optional().default(false).describe("Use bilibili inner proxy for resource access"),
  deterministic: z.boolean().optional().default(false).describe("Render by frame rather than recording")
});

// src/base/abort.ts
var AbortLink = class _AbortLink {
  constructor(query, interval = 1e3) {
    this.query = query;
    this.interval = interval;
    if (query) {
      this.tick();
    }
  }
  _callback;
  _aborted;
  _stopped = false;
  static start(query, interval) {
    return new _AbortLink(query, interval);
  }
  get aborted() {
    return !this._stopped && this._aborted;
  }
  get stopped() {
    return this._stopped;
  }
  async onAbort(callback) {
    if (this._aborted) {
      await callback();
    } else {
      this._callback = callback;
    }
  }
  wait(...handles) {
    const abort = new Promise((_, reject) => {
      this.onAbort(async () => {
        handles.forEach((h) => h.process.kill());
        reject(new Error("aborted"));
      });
    });
    return Promise.race([
      abort,
      Promise.all(handles.map((h) => h.wait))
      //
    ]);
  }
  stop() {
    this._stopped = true;
  }
  tick() {
    setTimeout(async () => {
      if (this._stopped) {
        return;
      }
      this._aborted = await this.query?.();
      if (this._stopped) {
        return;
      }
      if (this._aborted) {
        await this._callback?.();
      } else {
        this.tick();
      }
    }, this.interval);
  }
};

// src/base/limiter.ts
var ConcurrencyLimiter = class {
  constructor(maxConcurrency) {
    this.maxConcurrency = maxConcurrency;
  }
  _active = 0;
  _queue = [];
  _ended = false;
  get active() {
    return this._active;
  }
  get pending() {
    return this._queue.length;
  }
  get stats() {
    return `active: ${this.active}, pending: ${this.pending}`;
  }
  async schedule(fn) {
    if (this._ended) {
      throw new Error("ended");
    }
    return new Promise((resolve, reject) => {
      const run = () => {
        this._active++;
        fn().then((v) => {
          this._active--;
          resolve(v);
          this.next();
        }).catch((e) => {
          this._active--;
          reject(e);
          this.next();
        });
      };
      this._queue.push(run);
      this.next();
    });
  }
  async end() {
    if (this._ended) {
      return;
    }
    this._ended = true;
    while (this._active > 0 || this.pending > 0) {
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  next() {
    if (this._active < this.maxConcurrency) {
      this._queue.shift()?.();
    }
  }
};
var TAG = "[HWAccel]";
var softwareVendors = ["microsoft", "vmware", "virtualbox", "llvmpipe", "softpipe", "swiftshader"];
function isSoftwareRenderer(vendor) {
  const lower = vendor.toLowerCase();
  return softwareVendors.some((v) => lower.includes(v));
}
async function detectGPUDriver() {
  const { controllers } = await graphics();
  if (platform() === "linux") {
    try {
      const files = await readdir("/dev/dri");
      return files.some((f) => f.startsWith("renderD"));
    } catch {
      return false;
    }
  }
  logger.debug(TAG, "GPU controllers:", controllers);
  return controllers.some((c) => c.vendor.length > 0 && !isSoftwareRenderer(c.vendor));
}
var canIUseGPU = detectGPUDriver().then((result) => {
  logger.debug(TAG, "gpu:", result);
  return result;
});

// src/renderer/electron.ts
async function electronOpts() {
  const opts = [
    // 容器沙箱
    "no-sandbox",
    "disable-dev-shm-usage",
    // 跨域/安全
    "disable-web-security",
    "disable-site-isolation-trials",
    "ignore-certificate-errors",
    // 录制行为
    "disable-blink-features=AutomationControlled",
    "mute-audio",
    "autoplay-policy=no-user-gesture-required",
    "disable-extensions",
    // 渲染
    "headless=new",
    "force-device-scale-factor=1",
    "force-color-profile=srgb",
    "ignore-gpu-blocklist",
    "use-gl=angle",
    // 资源控制
    "num-raster-threads=2",
    "disable-background-networking",
    "js-flags=--max-old-space-size=4096"
  ];
  if (pupLogLevel < 3) {
    opts.push("log-level=3");
  }
  const enableGpu = await canIUseGPU && !pupDisableGPU;
  if (!enableGpu) {
    opts.push("use-angle=swiftshader", "enable-unsafe-swiftshader");
    return opts;
  }
  opts.push("disable-gpu-sandbox", "enable-unsafe-webgpu");
  const plat = platform();
  if (plat === "darwin") {
    opts.push("use-angle=metal");
  } else if (plat === "win32") {
    opts.push("use-angle=d3d11");
  } else {
    opts.push("use-angle=vulkan", "enable-features=Vulkan", "disable-vulkan-surface");
  }
  return opts;
}
var TAG2 = "[Electron]";
async function runElectronApp(size, args) {
  const cmdParts = [];
  const plat = platform();
  if (plat === "linux") {
    cmdParts.push(`xvfb-run`, `--auto-servernum`, `--server-args="-screen 0 ${size.width}x${size.height}x24"`);
  }
  const opts = await electronOpts();
  const electronArgs = opts.map((a) => `--${a}`);
  const base64Args = Buffer.from(JSON.stringify(args)).toString("base64");
  electronArgs.push(`${PUP_ARGS_KEY}=${base64Args}`);
  cmdParts.push(electron, ...electronArgs, pupApp);
  const cmd = cmdParts.join(" ");
  logger.debug(TAG2, cmd);
  return exec(cmd, {
    stdio: ["ignore", "pipe", "pipe"],
    shell: plat === "linux",
    env: { ...process.env, RUST_BACKTRACE: "full" }
  });
}

// src/pup.ts
var TAG3 = "[pup]";
var PROGRESS_TAG = " progress: ";
async function runPupApp(source, options) {
  logger.debug(TAG3, `runPupApp`, source, options);
  const args = [source];
  if (options.width) args.push("--width", `${options.width}`);
  if (options.height) args.push("--height", `${options.height}`);
  if (options.fps) args.push("--fps", `${options.fps}`);
  if (options.duration) args.push("--duration", `${options.duration}`);
  if (options.outDir) args.push("--out-dir", options.outDir);
  if (options.formats?.length) args.push("--formats", options.formats.join(","));
  if (options.withAudio) args.push("--with-audio");
  if (options.useInnerProxy) args.push("--use-inner-proxy");
  if (options.deterministic) args.push("--deterministic");
  const w = options.width ?? DEFAULT_WIDTH;
  const h = options.height ?? DEFAULT_HEIGHT;
  const handle = await runElectronApp({ width: w, height: h }, args);
  const counter = new ConcurrencyLimiter(1);
  handle.process.stdout?.on("data", (data) => {
    let message = data.toString().trim();
    let start = message.indexOf(PROGRESS_TAG);
    if (start < 0) {
      return;
    }
    message = message.slice(start + PROGRESS_TAG.length);
    const end = message.indexOf("%");
    if (end < 0) {
      return;
    }
    const progressStr = message.slice(0, end);
    const progress = parseNumber(progressStr);
    counter.schedule(async () => {
      await options.onProgress?.(progress);
    });
  });
  return { handle, counter };
}
async function pup(source, options) {
  logger.debug(TAG3, `pup`, source, options);
  const link = AbortLink.start(options.cancelQuery);
  const outDir = options.outDir ?? "out";
  const t0 = performance.now();
  const { handle, counter } = await runPupApp(source, { ...options, outDir });
  await link.wait(handle);
  await counter.end();
  link.stop();
  logger.info(TAG3, `done in ${Math.round(performance.now() - t0)}ms`);
  const sumPath = join(outDir, "summary.json");
  return JSON.parse(await readFile(sumPath, "utf-8"));
}

export { AbortLink, ConcurrencyLimiter, DEFAULT_DURATION, DEFAULT_FPS, DEFAULT_HEIGHT, DEFAULT_OUT_DIR, DEFAULT_WIDTH, Logger, PUP_ARGS_KEY, RenderSchema, VIDEO_FORMATS, __callDispose, __using, exec, isVideoFormat, logger, noerr, pargs, parseNumber, parseString, penv, pup, pupApp, pupDisableGPU, pupLogLevel, pupPkgRoot, pupUseInnerProxy };
//# sourceMappingURL=chunk-CNRKD76V.js.map
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9iYXNlL2Vudi50cyIsIi4uL3NyYy9iYXNlL3BhcnNlci50cyIsIi4uL3NyYy9iYXNlL2NvbnN0YW50cy50cyIsIi4uL3NyYy9iYXNlL2xvZ2dpbmcudHMiLCIuLi9zcmMvYmFzZS9ub2Vyci50cyIsIi4uL3NyYy9iYXNlL3Byb2Nlc3MudHMiLCIuLi9zcmMvcmVuZGVyZXIvc2NoZW1hLnRzIiwiLi4vc3JjL2Jhc2UvYWJvcnQudHMiLCIuLi9zcmMvYmFzZS9saW1pdGVyLnRzIiwiLi4vc3JjL2Jhc2UvaHdhY2NlbC50cyIsIi4uL3NyYy9yZW5kZXJlci9lbGVjdHJvbi50cyIsIi4uL3NyYy9wdXAudHMiXSwibmFtZXMiOlsicmVxdWlyZSIsInBsYXRmb3JtIiwiVEFHIiwiam9pbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBTU8sU0FBUyxJQUFBLENBQVEsSUFBQSxFQUFjLE1BQUEsRUFBc0IsWUFBQSxFQUFpQztBQUMzRixFQUFBLElBQUk7QUFDRixJQUFBLE9BQU8sTUFBQSxDQUFPLE9BQUEsQ0FBUSxHQUFBLENBQUksSUFBSSxDQUFDLENBQUE7QUFBQSxFQUNqQyxDQUFBLENBQUEsTUFBUTtBQUNOLElBQUEsT0FBTyxZQUFBO0FBQUEsRUFDVDtBQUNGOzs7QUNWTyxTQUFTLFlBQVksQ0FBQSxFQUFvQjtBQUM5QyxFQUFBLElBQUksT0FBTyxNQUFNLFFBQUEsRUFBVTtBQUN6QixJQUFBLE9BQU8sQ0FBQTtBQUFBLEVBQ1Q7QUFDQSxFQUFBLE1BQU0sR0FBQSxHQUFNLE9BQU8sQ0FBQyxDQUFBO0FBQ3BCLEVBQUEsSUFBSSxNQUFBLENBQU8sS0FBQSxDQUFNLEdBQUcsQ0FBQSxFQUFHO0FBQ3JCLElBQUEsTUFBTSxJQUFJLEtBQUEsQ0FBTSxDQUFBLE1BQUEsRUFBUyxDQUFDLENBQUEsc0JBQUEsQ0FB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RUFBQSxNQUFNLEVBQUUsTUFBQSxFQUFRLE9BQUEsRUFBUSxHQUFJLE1BQU0sU0FBQSxDQUFVLE1BQUEsRUFBUSxFQUFFLEdBQUcsT0FBQSxFQUFTLE1BQUEsRUFBUSxDQUFBO0FBRTFFLEVBQUEsTUFBTSxJQUFBLENBQUssS0FBSyxNQUFNLENBQUE7QUFDdEIsRUFBQSxNQUFNLFFBQVEsR0FBQSxFQUFJO0FBQ2xCLEVBQUEsSUFBQSxDQUFLLElBQUEsRUFBSztBQUNWLEVBQUEsTUFBQSxDQUFPLElBQUEsQ0FBS0EsSUFBQUEsRUFBSyxDQUFBLFFBQUEsRUFBVyxJQUFBLENBQUssS0FBQSxDQUFNLFlBQVksR0FBQSxFQUFJLEdBQUksRUFBRSxDQUFDLENBQUEsRUFBQSxDQUFJLENBQUE7QUFFbEUsRUFBQSxNQUFNLE9BQUEsR0FBVUMsSUFBQUEsQ0FBSyxNQUFBLEVBQVEsY0FBYyxDQUFBO0FBQzNDLEVBQUEsT0FBTyxLQUFLLEtBQUEsQ0FBTSxNQUFNLFFBQUEsQ0FBUyxPQUFBLEVBQVMsT0FBTyxDQUFDLENBQUE7QUFDcEQiLCJmaWxlIjoiY2h1bmstQ05SS0Q3NlYuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDcmVhdGVkIGJ5IEF1dG9rYWthIChxcTE5MDk2OTg0OTRAZ21haWwuY29tKSBvbiAyMDI2LzAyLzI1LlxuXG5leHBvcnQgdHlwZSBFbnZQYXJzZXI8VD4gPSAodmFsdWU6IHVua25vd24pID0+IFQ7XG5cbmV4cG9ydCBmdW5jdGlvbiBwZW52PFQ+KG5hbWU6IHN0cmluZywgcGFyc2VyOiBFbnZQYXJzZXI8VD4sIGRlZmF1bHRWYWx1ZTogVCk6IFQ7XG5leHBvcnQgZnVuY3Rpb24gcGVudjxUPihuYW1lOiBzdHJpbmcsIHBhcnNlcjogRW52UGFyc2VyPFQ+LCBkZWZhdWx0VmFsdWU/OiBUKTogVCB8IHVuZGVmaW5lZDtcbmV4cG9ydCBmdW5jdGlvbiBwZW52PFQ+KG5hbWU6IHN0cmluZywgcGFyc2VyOiBFbnZQYXJzZXI8VD4sIGRlZmF1bHRWYWx1ZT86IFQpOiBUIHwgdW5kZWZpbmVkIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gcGFyc2VyKHByb2Nlc3MuZW52W25hbWVdKTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGRlZmF1bHRWYWx1ZTtcbiAgfVxufVxuIiwiLy8gQ3JlYXRlZCBieSBBdXRva2FrYSAocXExOTA5Njk4NDk0QGdtYWlsLmNvbSkgb24gMjAyNi8wMS8zMC5cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlTnVtYmVyKHg6IHVua25vd24pOiBudW1iZXIge1xuICBpZiAodHlwZW9mIHggPT09IFwibnVtYmVyXCIpIHtcbiAgICByZXR1cm4geDtcbiAgfVxuICBjb25zdCBudW0gPSBOdW1iZXIoeCk7XG4gIGlmIChOdW1iZXIuaXNOYU4obnVtKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgVmFsdWUgJHt4fSBpcyBub3QgYSB2YWxpZCBudW1iZXJgKTtcbiAgfVxuICByZXR1cm4gbnVtO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VTdHJpbmcoeDogdW5rbm93bik6IHN0cmluZyB7XG4gIGlmICh0eXBlb2YgeCA9PT0gXCJzdHJpbmdcIikgcmV0dXJuIHg7XG4gIHJldHVybiBTdHJpbmcoeCk7XG59XG4iLCIvLyBDcmVhdGVkIGJ5IEF1dG9rYWthIChxcTE5MDk2OTg0OTRAZ21haWwuY29tKSBvbiAyMDI2LzAyLzA5LlxuXG5pbXBvcnQgeyBjcmVhdGVSZXF1aXJlIH0gZnJvbSBcIm1vZHVsZVwiO1xuaW1wb3J0IHsgZGlybmFtZSwgam9pbiB9IGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBwZW52IH0gZnJvbSBcIi4vZW52XCI7XG5pbXBvcnQgeyBwYXJzZU51bWJlciB9IGZyb20gXCIuL3BhcnNlclwiO1xuXG5jb25zdCByZXF1aXJlID0gY3JlYXRlUmVxdWlyZShpbXBvcnQubWV0YS51cmwpO1xuY29uc3QgZW52ID0gcHJvY2Vzcy5lbnY7XG5cbmV4cG9ydCBjb25zdCBwdXBMb2dMZXZlbCA9IHBlbnYoXCJQVVBfTE9HX0xFVkVMXCIsIHBhcnNlTnVtYmVyLCAyKTtcbmV4cG9ydCBjb25zdCBwdXBVc2VJbm5lclByb3h5ID0gZW52W1wiUFVQX1VTRV9JTk5FUl9QUk9YWVwiXSA9PT0gXCIxXCI7XG5leHBvcnQgY29uc3QgcHVwRGlzYWJsZUdQVSA9IGVudltcIlBVUF9ESVNBQkxFX0dQVVwiXSA9PT0gXCIxXCI7XG5cbmV4cG9ydCBjb25zdCBwdXBQa2dSb290ID0gZGlybmFtZShyZXF1aXJlLnJlc29sdmUoXCJwdXAtcmVjb3JkZXIvcGFja2FnZS5qc29uXCIpKTtcbmV4cG9ydCBjb25zdCBwdXBBcHAgPSBqb2luKHB1cFBrZ1Jvb3QsIFwiZGlzdFwiLCBcImFwcC5janNcIik7XG4iLCIvLyBDcmVhdGVkIGJ5IEF1dG9rYWthIChxcTE5MDk2OTg0OTRAZ21haWwuY29tKSBvbiAyMDI2LzAyLzA2LlxuXG5pbXBvcnQgeyBDaGlsZFByb2Nlc3MsIHR5cGUgU2VyaWFsaXphYmxlIH0gZnJvbSBcImNoaWxkX3Byb2Nlc3NcIjtcbmltcG9ydCB7IHB1cExvZ0xldmVsIH0gZnJvbSBcIi4vY29uc3RhbnRzXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTG9nZ2VyTGlrZSB7XG4gIGRlYnVnPyh0aGlzOiB2b2lkLCAuLi5tZXNzYWdlczogdW5rbm93bltdKTogdm9pZDtcblxuICBpbmZvPyh0aGlzOiB2b2lkLCAuLi5tZXNzYWdlczogdW5rbm93bltdKTogdm9pZDtcblxuICB3YXJuPyh0aGlzOiB2b2lkLCAuLi5tZXNzYWdlczogdW5rbm93bltdKTogdm9pZDtcblxuICBlcnJvcj8odGhpczogdm9pZCwgLi4ubWVzc2FnZXM6IHVua25vd25bXSk6IHZvaWQ7XG59XG5cbmNvbnN0IERFQlVHID0gXCI8cHVwQGRlYnVnPlwiO1xuY29uc3QgSU5GTyA9IFwiPHB1cEBpbmZvPlwiO1xuY29uc3QgV0FSTiA9IFwiPHB1cEB3YXJuPlwiO1xuY29uc3QgRVJST1IgPSBcIjxwdXBAZXJyb3I+XCI7XG5jb25zdCBGQVRBTCA9IFwiPHB1cEBmYXRhbD5cIjtcblxuZnVuY3Rpb24gc3RhY2tIb29rKHRhcmdldDogRnVuY3Rpb24sIF9jb250ZXh0OiBDbGFzc01ldGhvZERlY29yYXRvckNvbnRleHQpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uICh0aGlzOiBMb2dnZXIsIC4uLm1lc3NhZ2VzOiB1bmtub3duW10pIHtcbiAgICBjb25zdCBwcm9jZXNzZWQgPSBtZXNzYWdlcy5tYXAoKG1zZykgPT4ge1xuICAgICAgcmV0dXJuIG1zZyBpbnN0YW5jZW9mIEVycm9yID8gKG1zZy5zdGFjayA/PyBTdHJpbmcobXNnKSkgOiBtc2c7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRhcmdldC5jYWxsKHRoaXMsIC4uLnByb2Nlc3NlZCk7XG4gIH07XG59XG5cbmV4cG9ydCBjbGFzcyBMb2dnZXIgaW1wbGVtZW50cyBMb2dnZXJMaWtlIHtcbiAgcHJpdmF0ZSBfaW1wbD86IExvZ2dlckxpa2U7XG5cbiAgZ2V0IGxldmVsKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX2xldmVsO1xuICB9XG5cbiAgc2V0IGxldmVsKHZhbHVlOiBudW1iZXIpIHtcbiAgICB0aGlzLl9sZXZlbCA9IHZhbHVlO1xuICAgIHRoaXMuaW1wbCA9IHRoaXMuX2ltcGwgPz8gY29uc29sZTtcbiAgfVxuXG4gIGdldCBpbXBsKCk6IExvZ2dlckxpa2UgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLl9pbXBsO1xuICB9XG5cbiAgc2V0IGltcGwodmFsdWU6IExvZ2dlckxpa2UpIHtcbiAgICBjb25zdCBkZWJ1ZyA9IHZhbHVlLmRlYnVnID8/IGNvbnNvbGUuZGVidWc7XG4gICAgY29uc3QgaW5mbyA9IHZhbHVlLmluZm8gPz8gY29uc29sZS5pbmZvO1xuICAgIGNvbnN0IHdhcm4gPSB2YWx1ZS53YXJuID8/IGNvbnNvbGUud2FybjtcbiAgICBjb25zdCBlcnJvciA9IHZhbHVlLmVycm9yID8/IGNvbnNvbGUuZXJyb3I7XG4gICAgY29uc3QgbHYgPSB0aGlzLl9sZXZlbDtcbiAgICB0aGlzLl9pbXBsID0ge1xuICAgICAgZGVidWc6IGx2ID49IDMgPyBkZWJ1ZyA6IHVuZGVmaW5lZCxcbiAgICAgIGluZm86IGx2ID49IDIgPyBpbmZvIDogdW5kZWZpbmVkLFxuICAgICAgd2FybjogbHYgPj0gMSA/IHdhcm4gOiB1bmRlZmluZWQsXG4gICAgICBlcnJvcjogbHYgPj0gMCA/IGVycm9yIDogdW5kZWZpbmVkLFxuICAgIH07XG4gIH1cblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIF9sZXZlbDogbnVtYmVyID0gcHVwTG9nTGV2ZWwpIHtcbiAgICB0aGlzLmltcGwgPSBjb25zb2xlO1xuICB9XG5cbiAgQHN0YWNrSG9va1xuICBkZWJ1ZyguLi5tZXNzYWdlczogdW5rbm93bltdKTogdm9pZCB7XG4gICAgdGhpcy5pbXBsPy5kZWJ1Zz8uKERFQlVHLCAuLi5tZXNzYWdlcyk7XG4gIH1cblxuICBAc3RhY2tIb29rXG4gIGluZm8oLi4ubWVzc2FnZXM6IHVua25vd25bXSk6IHZvaWQge1xuICAgIHRoaXMuaW1wbD8uaW5mbz8uKElORk8sIC4uLm1lc3NhZ2VzKTtcbiAgfVxuXG4gIEBzdGFja0hvb2tcbiAgd2FybiguLi5tZXNzYWdlczogdW5rbm93bltdKTogdm9pZCB7XG4gICAgdGhpcy5pbXBsPy53YXJuPy4oV0FSTiwgLi4ubWVzc2FnZXMpO1xuICB9XG5cbiAgQHN0YWNrSG9va1xuICBlcnJvciguLi5tZXNzYWdlczogdW5rbm93bltdKTogdm9pZCB7XG4gICAgdGhpcy5pbXBsPy5lcnJvcj8uKEVSUk9SLCAuLi5tZXNzYWdlcyk7XG4gIH1cblxuICBAc3RhY2tIb29rXG4gIGZhdGFsKC4uLm1lc3NhZ2VzOiB1bmtub3duW10pOiB2b2lkIHtcbiAgICB0aGlzLmltcGw/LmVycm9yPy4oRkFUQUwsIC4uLm1lc3NhZ2VzKTtcbiAgICBwcm9jZXNzLmV4aXQoMSk7XG4gIH1cblxuICBwcml2YXRlIGRpc3BhdGNoKG1lc3NhZ2U6IHN0cmluZykge1xuICAgIGlmIChtZXNzYWdlLnN0YXJ0c1dpdGgoREVCVUcpKSB7XG4gICAgICB0aGlzLmRlYnVnKG1lc3NhZ2Uuc2xpY2UoREVCVUcubGVuZ3RoICsgMSkpO1xuICAgIH0gZWxzZSBpZiAobWVzc2FnZS5zdGFydHNXaXRoKElORk8pKSB7XG4gICAgICB0aGlzLmluZm8obWVzc2FnZS5zbGljZShJTkZPLmxlbmd0aCArIDEpKTtcbiAgICB9IGVsc2UgaWYgKG1lc3NhZ2Uuc3RhcnRzV2l0aChXQVJOKSkge1xuICAgICAgdGhpcy53YXJuKG1lc3NhZ2Uuc2xpY2UoV0FSTi5sZW5ndGggKyAxKSk7XG4gICAgfSBlbHNlIGlmIChtZXNzYWdlLnN0YXJ0c1dpdGgoRVJST1IpKSB7XG4gICAgICB0aGlzLmVycm9yKG1lc3NhZ2Uuc2xpY2UoRVJST1IubGVuZ3RoICsgMSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmluZm8obWVzc2FnZSk7XG4gICAgfVxuICB9XG5cbiAgYXR0YWNoKHByb2M6IENoaWxkUHJvY2VzcywgbmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHRoaXMuZGVidWcoYCR7bmFtZX0uYXR0YWNoYCk7XG4gICAgICBsZXQgZmF0YWw6IHN0cmluZyA9IFwiXCI7XG4gICAgICBjb25zdCBkaXNwYXRjaCA9IChkYXRhOiBCdWZmZXIgfCBTZXJpYWxpemFibGUpID0+IHtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IGRhdGEudG9TdHJpbmcoKTtcbiAgICAgICAgaWYgKG1lc3NhZ2Uuc3RhcnRzV2l0aChGQVRBTCkpIHtcbiAgICAgICAgICBmYXRhbCArPSBtZXNzYWdlLnNsaWNlKEZBVEFMLmxlbmd0aCArIDEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuZGlzcGF0Y2gobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBwcm9jLnN0ZGVycj8ub24oXCJkYXRhXCIsIGRpc3BhdGNoKTtcbiAgICAgIHByb2Muc3Rkb3V0Py5vbihcImRhdGFcIiwgZGlzcGF0Y2gpO1xuICAgICAgcHJvY1xuICAgICAgICAub24oXCJtZXNzYWdlXCIsIGRpc3BhdGNoKVxuICAgICAgICAub24oXCJlcnJvclwiLCAoZXJyKSA9PiB7XG4gICAgICAgICAgZmF0YWwgKz0gZXJyLm1lc3NhZ2U7XG4gICAgICAgICAgcHJvYy5raWxsKCk7XG4gICAgICAgIH0pXG4gICAgICAgIC5vbmNlKFwiY2xvc2VcIiwgKGNvZGUsIHNpZ25hbCkgPT4ge1xuICAgICAgICAgIGlmIChjb2RlIHx8IHNpZ25hbCB8fCBmYXRhbCkge1xuICAgICAgICAgICAgZmF0YWwgfHw9IGBjb21tYW5kIGZhaWxlZDogJHtwcm9jLnNwYXduYXJncy5qb2luKFwiIFwiKX1gO1xuICAgICAgICAgICAgdGhpcy5kZWJ1ZyhgJHtuYW1lfS5jbG9zZWAsIHsgY29kZSwgc2lnbmFsLCBmYXRhbCB9KTtcbiAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoZmF0YWwpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5kZWJ1ZyhgJHtuYW1lfS5jbG9zZWApO1xuICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgLm9uKFwidW5oYW5kbGVkUmVqZWN0aW9uXCIsIChyZWFzb24pID0+IHtcbiAgICAgICAgICB0aGlzLmVycm9yKGAke25hbWV9LnVuaGFuZGxlZGAsIHJlYXNvbik7XG4gICAgICAgIH0pXG4gICAgICAgIC5vbihcInVuY2F1Z2h0RXhjZXB0aW9uTW9uaXRvclwiLCAoZXJyKSA9PiB7XG4gICAgICAgICAgdGhpcy5lcnJvcihgJHtuYW1lfS51bmhhbmRsZWRgLCBlcnIpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgfVxufVxuXG5jb25zdCBsb2dnZXIgPSBuZXcgTG9nZ2VyKCk7XG5cbmV4cG9ydCB7IGxvZ2dlciB9O1xuIiwiLy8gQ3JlYXRlZCBieSBBdXRva2FrYSAocXExOTA5Njk4NDk0QGdtYWlsLmNvbSkgb24gMjAyNi8wMi8yNC5cblxuZXhwb3J0IGZ1bmN0aW9uIG5vZXJyPEZuIGV4dGVuZHMgKC4uLmFyZ3M6IGFueVtdKSA9PiBhbnksIEQ+KFxuICBmbjogRm4sXG4gIGRlZmF1bHRWYWx1ZTogRCxcbik6ICguLi5hcmdzOiBQYXJhbWV0ZXJzPEZuPikgPT4gUmV0dXJuVHlwZTxGbj4gfCBEIHtcbiAgcmV0dXJuICguLi5hcmdzKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJldCA9IGZuKC4uLmFyZ3MpO1xuICAgICAgaWYgKHJldCBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgICAgcmV0dXJuIHJldC5jYXRjaCgoKSA9PiBkZWZhdWx0VmFsdWUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJldDtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBkZWZhdWx0VmFsdWU7XG4gICAgfVxuICB9O1xufVxuIiwiLy8gQ3JlYXRlZCBieSBBdXRva2FrYSAocXExOTA5Njk4NDk0QGdtYWlsLmNvbSkgb24gMjAyNi8wMS8zMC5cblxuaW1wb3J0IHsgc3Bhd24sIHR5cGUgQ2hpbGRQcm9jZXNzLCB0eXBlIFNwYXduT3B0aW9ucyB9IGZyb20gXCJjaGlsZF9wcm9jZXNzXCI7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tIFwiLi9sb2dnaW5nXCI7XG5cbmV4cG9ydCBjb25zdCBQVVBfQVJHU19LRVkgPSBcIi0tcHVwLXByaXYtYXJnc1wiO1xuXG5leHBvcnQgZnVuY3Rpb24gcGFyZ3MoKSB7XG4gIGNvbnN0IGFyZ3YgPSBwcm9jZXNzLmFyZ3Y7XG4gIGxldCBwcml2ID0gYXJndi5maW5kKChhcmcpID0+IGFyZy5zdGFydHNXaXRoKFBVUF9BUkdTX0tFWSkpO1xuICBpZiAoIXByaXYpIHtcbiAgICBsb2dnZXIuZGVidWcoXCJwcm9jYXJndlwiLCBhcmd2KTtcbiAgICByZXR1cm4gcHJvY2Vzcy5hcmd2O1xuICB9XG4gIGNvbnN0IGFyZ3MgPSBbXCJleGVjXCIsIC4uLmFyZ3Yuc2xpY2UoLTEpXTtcbiAgcHJpdiA9IEJ1ZmZlci5mcm9tKHByaXYuc3BsaXQoXCI9XCIpWzFdISwgXCJiYXNlNjRcIikudG9TdHJpbmcoKTtcbiAgYXJncy5wdXNoKC4uLkpTT04ucGFyc2UocHJpdikpO1xuICBsb2dnZXIuZGVidWcoXCJwdXBhcmdzXCIsIGFyZ3MpO1xuICByZXR1cm4gYXJncztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQcm9jZXNzSGFuZGxlIHtcbiAgcHJvY2VzczogQ2hpbGRQcm9jZXNzO1xuICB3YWl0OiBQcm9taXNlPHZvaWQ+O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZXhlYyhjbWQ6IHN0cmluZywgb3B0aW9ucz86IFNwYXduT3B0aW9ucyk6IFByb2Nlc3NIYW5kbGUge1xuICBjb25zdCBwYXJ0cyA9IGNtZC5zcGxpdChcIiBcIikuZmlsdGVyKChzKSA9PiBzLmxlbmd0aCk7XG4gIGNvbnN0IFtjb21tYW5kLCAuLi5hcmdzXSA9IHBhcnRzO1xuICBpZiAoIWNvbW1hbmQpIHRocm93IG5ldyBFcnJvcihcImVtcHR5IGNvbW1hbmRcIik7XG4gIGNvbnN0IHByb2MgPSBzcGF3bihjb21tYW5kLCBhcmdzLCB7XG4gICAgc3RkaW86IFwiaW5oZXJpdFwiLFxuICAgIC4uLm9wdGlvbnMsXG4gIH0pO1xuICByZXR1cm4geyBwcm9jZXNzOiBwcm9jLCB3YWl0OiBsb2dnZXIuYXR0YWNoKHByb2MsIGNvbW1hbmQpIH07XG59XG4iLCIvLyBDcmVhdGVkIGJ5IEF1dG9rYWthIChxcTE5MDk2OTg0OTRAZ21haWwuY29tKSBvbiAyMDI2LzAyLzA2LlxuXG5pbXBvcnQgeiBmcm9tIFwiem9kXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVmlkZW9GaWxlcyB7XG4gIGNvdmVyOiBzdHJpbmc7XG4gIG1wND86IHN0cmluZztcbiAgd2VibT86IHN0cmluZztcbn1cblxuZXhwb3J0IGNvbnN0IERFRkFVTFRfV0lEVEggPSAxOTIwO1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfSEVJR0hUID0gMTA4MDtcbmV4cG9ydCBjb25zdCBERUZBVUxUX0ZQUyA9IDMwO1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfRFVSQVRJT04gPSA1O1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfT1VUX0RJUiA9IFwib3V0XCI7XG5leHBvcnQgY29uc3QgVklERU9fRk9STUFUUyA9IFtcIm1wNFwiLCBcIndlYm1cIl0gYXMgY29uc3Q7XG5cbmV4cG9ydCB0eXBlIFZpZGVvRm9ybWF0ID0gKHR5cGVvZiBWSURFT19GT1JNQVRTKVtudW1iZXJdO1xuXG5leHBvcnQgZnVuY3Rpb24gaXNWaWRlb0Zvcm1hdChzOiBzdHJpbmcpOiBzIGlzIFZpZGVvRm9ybWF0IHtcbiAgcmV0dXJuIFZJREVPX0ZPUk1BVFMuaW5jbHVkZXMocyBhcyBWaWRlb0Zvcm1hdCk7XG59XG5cbmV4cG9ydCBjb25zdCBSZW5kZXJTY2hlbWEgPSB6Lm9iamVjdCh7XG4gIGR1cmF0aW9uOiB6Lm51bWJlcigpLm9wdGlvbmFsKCkuZGVmYXVsdChERUZBVUxUX0RVUkFUSU9OKS5kZXNjcmliZShcIkR1cmF0aW9uIGluIHNlY29uZHNcIiksXG4gIHdpZHRoOiB6Lm51bWJlcigpLm9wdGlvbmFsKCkuZGVmYXVsdChERUZBVUxUX1dJRFRIKS5kZXNjcmliZShcIlZpZGVvIHdpZHRoXCIpLFxuICBoZWlnaHQ6IHoubnVtYmVyKCkub3B0aW9uYWwoKS5kZWZhdWx0KERFRkFVTFRfSEVJR0hUKS5kZXNjcmliZShcIlZpZGVvIGhlaWdodFwiKSxcbiAgZnBzOiB6Lm51bWJlcigpLm9wdGlvbmFsKCkuZGVmYXVsdChERUZBVUxUX0ZQUykuZGVzY3JpYmUoXCJGcmFtZXMgcGVyIHNlY29uZFwiKSxcbiAgZm9ybWF0czogelxuICAgIC5hcnJheSh6LmVudW0oVklERU9fRk9STUFUUykpXG4gICAgLm9wdGlvbmFsKClcbiAgICAuZGVmYXVsdChbXCJtcDRcIl0pXG4gICAgLmRlc2NyaWJlKGBPdXRwdXQgdmlkZW8gZm9ybWF0cywgYWxsb3cgJHtWSURFT19GT1JNQVRTLmpvaW4oXCIsIFwiKX1gKSxcbiAgd2l0aEF1ZGlvOiB6LmJvb2xlYW4oKS5vcHRpb25hbCgpLmRlZmF1bHQoZmFsc2UpLmRlc2NyaWJlKFwiQ2FwdHVyZSBhbmQgZW5jb2RlIGF1ZGlvXCIpLFxuICBvdXREaXI6IHouc3RyaW5nKCkub3B0aW9uYWwoKS5kZWZhdWx0KERFRkFVTFRfT1VUX0RJUikuZGVzY3JpYmUoXCJPdXRwdXQgZGlyZWN0b3J5XCIpLFxuICB1c2VJbm5lclByb3h5OiB6LmJvb2xlYW4oKS5vcHRpb25hbCgpLmRlZmF1bHQoZmFsc2UpLmRlc2NyaWJlKFwiVXNlIGJpbGliaWxpIGlubmVyIHByb3h5IGZvciByZXNvdXJjZSBhY2Nlc3NcIiksXG4gIGRldGVybWluaXN0aWM6IHouYm9vbGVhbigpLm9wdGlvbmFsKCkuZGVmYXVsdChmYWxzZSkuZGVzY3JpYmUoXCJSZW5kZXIgYnkgZnJhbWUgcmF0aGVyIHRoYW4gcmVjb3JkaW5nXCIpLFxufSk7XG5cbmV4cG9ydCB0eXBlIFJlbmRlck9wdGlvbnMgPSB6LmluZmVyPHR5cGVvZiBSZW5kZXJTY2hlbWE+O1xuXG5leHBvcnQgaW50ZXJmYWNlIFJlbmRlclJlc3VsdCB7XG4gIG9wdGlvbnM6IFJlbmRlck9wdGlvbnM7XG4gIHdyaXR0ZW46IG51bWJlcjtcbiAgZmlsZXM6IFZpZGVvRmlsZXM7XG59XG4iLCIvLyBDcmVhdGVkIGJ5IEF1dG9rYWthIChxcTE5MDk2OTg0OTRAZ21haWwuY29tKSBvbiAyMDI2LzAyLzExLlxuXG5pbXBvcnQgdHlwZSB7IFByb2Nlc3NIYW5kbGUgfSBmcm9tIFwiLi9wcm9jZXNzXCI7XG5cbmV4cG9ydCB0eXBlIEFzeW5jVGFzayA9ICgpID0+IFByb21pc2U8dm9pZD4gfCB2b2lkO1xuZXhwb3J0IHR5cGUgQWJvcnRRdWVyeSA9ICgpID0+IFByb21pc2U8Ym9vbGVhbj4gfCBib29sZWFuO1xuXG5leHBvcnQgY2xhc3MgQWJvcnRMaW5rIHtcbiAgcHJpdmF0ZSBfY2FsbGJhY2s/OiBBc3luY1Rhc2s7XG4gIHByaXZhdGUgX2Fib3J0ZWQ/OiBib29sZWFuO1xuICBwcml2YXRlIF9zdG9wcGVkID0gZmFsc2U7XG5cbiAgcHJpdmF0ZSBjb25zdHJ1Y3RvcihcbiAgICByZWFkb25seSBxdWVyeT86IEFib3J0UXVlcnksXG4gICAgcmVhZG9ubHkgaW50ZXJ2YWw6IG51bWJlciA9IDEwMDAsXG4gICkge1xuICAgIGlmIChxdWVyeSkge1xuICAgICAgdGhpcy50aWNrKCk7XG4gICAgfVxuICB9XG5cbiAgc3RhdGljIHN0YXJ0KHF1ZXJ5PzogQWJvcnRRdWVyeSwgaW50ZXJ2YWw/OiBudW1iZXIpIHtcbiAgICByZXR1cm4gbmV3IEFib3J0TGluayhxdWVyeSwgaW50ZXJ2YWwpO1xuICB9XG5cbiAgZ2V0IGFib3J0ZWQoKSB7XG4gICAgcmV0dXJuICF0aGlzLl9zdG9wcGVkICYmIHRoaXMuX2Fib3J0ZWQ7XG4gIH1cblxuICBnZXQgc3RvcHBlZCgpIHtcbiAgICByZXR1cm4gdGhpcy5fc3RvcHBlZDtcbiAgfVxuXG4gIGFzeW5jIG9uQWJvcnQoY2FsbGJhY2s6IEFzeW5jVGFzaykge1xuICAgIGlmICh0aGlzLl9hYm9ydGVkKSB7XG4gICAgICBhd2FpdCBjYWxsYmFjaygpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9jYWxsYmFjayA9IGNhbGxiYWNrO1xuICAgIH1cbiAgfVxuXG4gIHdhaXQoLi4uaGFuZGxlczogUHJvY2Vzc0hhbmRsZVtdKSB7XG4gICAgY29uc3QgYWJvcnQgPSBuZXcgUHJvbWlzZSgoXywgcmVqZWN0KSA9PiB7XG4gICAgICB0aGlzLm9uQWJvcnQoYXN5bmMgKCkgPT4ge1xuICAgICAgICBoYW5kbGVzLmZvckVhY2goKGgpID0+IGgucHJvY2Vzcy5raWxsKCkpO1xuICAgICAgICByZWplY3QobmV3IEVycm9yKFwiYWJvcnRlZFwiKSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICByZXR1cm4gUHJvbWlzZS5yYWNlKFtcbiAgICAgIGFib3J0LFxuICAgICAgUHJvbWlzZS5hbGwoaGFuZGxlcy5tYXAoKGgpID0+IGgud2FpdCkpLCAvL1xuICAgIF0pO1xuICB9XG5cbiAgc3RvcCgpIHtcbiAgICB0aGlzLl9zdG9wcGVkID0gdHJ1ZTtcbiAgfVxuXG4gIHByaXZhdGUgdGljaygpIHtcbiAgICBzZXRUaW1lb3V0KGFzeW5jICgpID0+IHtcbiAgICAgIGlmICh0aGlzLl9zdG9wcGVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXMuX2Fib3J0ZWQgPSBhd2FpdCB0aGlzLnF1ZXJ5Py4oKTtcbiAgICAgIGlmICh0aGlzLl9zdG9wcGVkKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmICh0aGlzLl9hYm9ydGVkKSB7XG4gICAgICAgIGF3YWl0IHRoaXMuX2NhbGxiYWNrPy4oKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMudGljaygpO1xuICAgICAgfVxuICAgIH0sIHRoaXMuaW50ZXJ2YWwpO1xuICB9XG59XG4iLCIvLyBDcmVhdGVkIGJ5IEF1dG9rYWthIChxcTE5MDk2OTg0OTRAZ21haWwuY29tKSBvbiAyMDI2LzAxLzMwLlxuXG5leHBvcnQgY2xhc3MgQ29uY3VycmVuY3lMaW1pdGVyIHtcbiAgcHJpdmF0ZSBfYWN0aXZlID0gMDtcbiAgcHJpdmF0ZSBfcXVldWU6IFZvaWRGdW5jdGlvbltdID0gW107XG4gIHByaXZhdGUgX2VuZGVkID0gZmFsc2U7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgbWF4Q29uY3VycmVuY3k6IG51bWJlcikge31cblxuICBnZXQgYWN0aXZlKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX2FjdGl2ZTtcbiAgfVxuXG4gIGdldCBwZW5kaW5nKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX3F1ZXVlLmxlbmd0aDtcbiAgfVxuXG4gIGdldCBzdGF0cygpOiBzdHJpbmcge1xuICAgIHJldHVybiBgYWN0aXZlOiAke3RoaXMuYWN0aXZlfSwgcGVuZGluZzogJHt0aGlzLnBlbmRpbmd9YDtcbiAgfVxuXG4gIGFzeW5jIHNjaGVkdWxlPFQ+KGZuOiAoKSA9PiBQcm9taXNlPFQ+KTogUHJvbWlzZTxUPiB7XG4gICAgaWYgKHRoaXMuX2VuZGVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJlbmRlZFwiKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPFQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IHJ1biA9ICgpID0+IHtcbiAgICAgICAgdGhpcy5fYWN0aXZlKys7XG4gICAgICAgIGZuKClcbiAgICAgICAgICAudGhlbigodikgPT4ge1xuICAgICAgICAgICAgdGhpcy5fYWN0aXZlLS07XG4gICAgICAgICAgICByZXNvbHZlKHYpO1xuICAgICAgICAgICAgdGhpcy5uZXh0KCk7XG4gICAgICAgICAgfSlcbiAgICAgICAgICAuY2F0Y2goKGUpID0+IHtcbiAgICAgICAgICAgIHRoaXMuX2FjdGl2ZS0tO1xuICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICAgICAgdGhpcy5uZXh0KCk7XG4gICAgICAgICAgfSk7XG4gICAgICB9O1xuICAgICAgdGhpcy5fcXVldWUucHVzaChydW4pO1xuICAgICAgdGhpcy5uZXh0KCk7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBlbmQoKSB7XG4gICAgaWYgKHRoaXMuX2VuZGVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX2VuZGVkID0gdHJ1ZTtcbiAgICB3aGlsZSAodGhpcy5fYWN0aXZlID4gMCB8fCB0aGlzLnBlbmRpbmcgPiAwKSB7XG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocikgPT4gc2V0VGltZW91dChyLCA1MCkpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgbmV4dCgpIHtcbiAgICBpZiAodGhpcy5fYWN0aXZlIDwgdGhpcy5tYXhDb25jdXJyZW5jeSkge1xuICAgICAgdGhpcy5fcXVldWUuc2hpZnQoKT8uKCk7XG4gICAgfVxuICB9XG59XG4iLCIvLyBDcmVhdGVkIGJ5IEF1dG9rYWthIChxcTE5MDk2OTg0OTRAZ21haWwuY29tKSBvbiAyMDI2LzAyLzI3LlxuXG5pbXBvcnQgeyByZWFkZGlyIH0gZnJvbSBcImZzL3Byb21pc2VzXCI7XG5pbXBvcnQgeyBwbGF0Zm9ybSB9IGZyb20gXCJvc1wiO1xuaW1wb3J0IHsgZ3JhcGhpY3MgfSBmcm9tIFwic3lzdGVtaW5mb3JtYXRpb25cIjtcbmltcG9ydCB7IGxvZ2dlciB9IGZyb20gXCIuL2xvZ2dpbmdcIjtcblxuY29uc3QgVEFHID0gXCJbSFdBY2NlbF1cIjtcblxuY29uc3Qgc29mdHdhcmVWZW5kb3JzID0gW1wibWljcm9zb2Z0XCIsIFwidm13YXJlXCIsIFwidmlydHVhbGJveFwiLCBcImxsdm1waXBlXCIsIFwic29mdHBpcGVcIiwgXCJzd2lmdHNoYWRlclwiXTtcblxuZnVuY3Rpb24gaXNTb2Z0d2FyZVJlbmRlcmVyKHZlbmRvcjogc3RyaW5nKSB7XG4gIGNvbnN0IGxvd2VyID0gdmVuZG9yLnRvTG93ZXJDYXNlKCk7XG4gIHJldHVybiBzb2Z0d2FyZVZlbmRvcnMuc29tZSgodikgPT4gbG93ZXIuaW5jbHVkZXModikpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBkZXRlY3RHUFVEcml2ZXIoKSB7XG4gIGNvbnN0IHsgY29udHJvbGxlcnMgfSA9IGF3YWl0IGdyYXBoaWNzKCk7XG4gIGlmIChwbGF0Zm9ybSgpID09PSBcImxpbnV4XCIpIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgZmlsZXMgPSBhd2FpdCByZWFkZGlyKFwiL2Rldi9kcmlcIik7XG4gICAgICByZXR1cm4gZmlsZXMuc29tZSgoZikgPT4gZi5zdGFydHNXaXRoKFwicmVuZGVyRFwiKSk7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG4gIGxvZ2dlci5kZWJ1ZyhUQUcsIFwiR1BVIGNvbnRyb2xsZXJzOlwiLCBjb250cm9sbGVycyk7XG4gIHJldHVybiBjb250cm9sbGVycy5zb21lKChjKSA9PiBjLnZlbmRvci5sZW5ndGggPiAwICYmICFpc1NvZnR3YXJlUmVuZGVyZXIoYy52ZW5kb3IpKTtcbn1cblxuZXhwb3J0IGNvbnN0IGNhbklVc2VHUFUgPSBkZXRlY3RHUFVEcml2ZXIoKS50aGVuKChyZXN1bHQpID0+IHtcbiAgbG9nZ2VyLmRlYnVnKFRBRywgXCJncHU6XCIsIHJlc3VsdCk7XG4gIHJldHVybiByZXN1bHQ7XG59KTtcbiIsIi8vIENyZWF0ZWQgYnkgQXV0b2tha2EgKHFxMTkwOTY5ODQ5NEBnbWFpbC5jb20pIG9uIDIwMjYvMDIvMjUuXG5cbmltcG9ydCBlbGVjdHJvbiwgeyB0eXBlIFNpemUgfSBmcm9tIFwiZWxlY3Ryb25cIjtcbmltcG9ydCB7IHBsYXRmb3JtIH0gZnJvbSBcIm9zXCI7XG5pbXBvcnQgeyBwdXBBcHAsIHB1cERpc2FibGVHUFUsIHB1cExvZ0xldmVsIH0gZnJvbSBcIi4uL2Jhc2UvY29uc3RhbnRzXCI7XG5pbXBvcnQgeyBjYW5JVXNlR1BVIH0gZnJvbSBcIi4uL2Jhc2UvaHdhY2NlbFwiO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSBcIi4uL2Jhc2UvbG9nZ2luZ1wiO1xuaW1wb3J0IHsgZXhlYywgUFVQX0FSR1NfS0VZIH0gZnJvbSBcIi4uL2Jhc2UvcHJvY2Vzc1wiO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZWxlY3Ryb25PcHRzKCkge1xuICBjb25zdCBvcHRzID0gW1xuICAgIC8vIOWuueWZqOaymeeusVxuICAgIFwibm8tc2FuZGJveFwiLFxuICAgIFwiZGlzYWJsZS1kZXYtc2htLXVzYWdlXCIsXG4gICAgLy8g6Leo5Z+fL+WuieWFqFxuICAgIFwiZGlzYWJsZS13ZWItc2VjdXJpdHlcIixcbiAgICBcImRpc2FibGUtc2l0ZS1pc29sYXRpb24tdHJpYWxzXCIsXG4gICAgXCJpZ25vcmUtY2VydGlmaWNhdGUtZXJyb3JzXCIsXG4gICAgLy8g5b2V5Yi26KGM5Li6XG4gICAgXCJkaXNhYmxlLWJsaW5rLWZlYXR1cmVzPUF1dG9tYXRpb25Db250cm9sbGVkXCIsXG4gICAgXCJtdXRlLWF1ZGlvXCIsXG4gICAgXCJhdXRvcGxheS1wb2xpY3k9bm8tdXNlci1nZXN0dXJlLXJlcXVpcmVkXCIsXG4gICAgXCJkaXNhYmxlLWV4dGVuc2lvbnNcIixcbiAgICAvLyDmuLLmn5NcbiAgICBcImhlYWRsZXNzPW5ld1wiLFxuICAgIFwiZm9yY2UtZGV2aWNlLXNjYWxlLWZhY3Rvcj0xXCIsXG4gICAgXCJmb3JjZS1jb2xvci1wcm9maWxlPXNyZ2JcIixcbiAgICBcImlnbm9yZS1ncHUtYmxvY2tsaXN0XCIsXG4gICAgXCJ1c2UtZ2w9YW5nbGVcIixcbiAgICAvLyDotYTmupDmjqfliLZcbiAgICBcIm51bS1yYXN0ZXItdGhyZWFkcz0yXCIsXG4gICAgXCJkaXNhYmxlLWJhY2tncm91bmQtbmV0d29ya2luZ1wiLFxuICAgIFwianMtZmxhZ3M9LS1tYXgtb2xkLXNwYWNlLXNpemU9NDA5NlwiLFxuICBdO1xuICBpZiAocHVwTG9nTGV2ZWwgPCAzKSB7XG4gICAgb3B0cy5wdXNoKFwibG9nLWxldmVsPTNcIik7XG4gIH1cblxuICBjb25zdCBlbmFibGVHcHUgPSAoYXdhaXQgY2FuSVVzZUdQVSkgJiYgIXB1cERpc2FibGVHUFU7XG4gIGlmICghZW5hYmxlR3B1KSB7XG4gICAgb3B0cy5wdXNoKFwidXNlLWFuZ2xlPXN3aWZ0c2hhZGVyXCIsIFwiZW5hYmxlLXVuc2FmZS1zd2lmdHNoYWRlclwiKTtcbiAgICByZXR1cm4gb3B0cztcbiAgfVxuXG4gIG9wdHMucHVzaChcImRpc2FibGUtZ3B1LXNhbmRib3hcIiwgXCJlbmFibGUtdW5zYWZlLXdlYmdwdVwiKTtcbiAgY29uc3QgcGxhdCA9IHBsYXRmb3JtKCk7XG4gIGlmIChwbGF0ID09PSBcImRhcndpblwiKSB7XG4gICAgb3B0cy5wdXNoKFwidXNlLWFuZ2xlPW1ldGFsXCIpO1xuICB9IGVsc2UgaWYgKHBsYXQgPT09IFwid2luMzJcIikge1xuICAgIG9wdHMucHVzaChcInVzZS1hbmdsZT1kM2QxMVwiKTtcbiAgfSBlbHNlIHtcbiAgICBvcHRzLnB1c2goXCJ1c2UtYW5nbGU9dnVsa2FuXCIsIFwiZW5hYmxlLWZlYXR1cmVzPVZ1bGthblwiLCBcImRpc2FibGUtdnVsa2FuLXN1cmZhY2VcIik7XG4gIH1cbiAgcmV0dXJuIG9wdHM7XG59XG5cbmNvbnN0IFRBRyA9IFwiW0VsZWN0cm9uXVwiO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcnVuRWxlY3Ryb25BcHAoc2l6ZTogU2l6ZSwgYXJnczogdW5rbm93bltdKSB7XG4gIGNvbnN0IGNtZFBhcnRzOiB1bmtub3duW10gPSBbXTtcbiAgY29uc3QgcGxhdCA9IHBsYXRmb3JtKCk7XG4gIGlmIChwbGF0ID09PSBcImxpbnV4XCIpIHtcbiAgICBjbWRQYXJ0cy5wdXNoKGB4dmZiLXJ1bmAsIGAtLWF1dG8tc2VydmVybnVtYCwgYC0tc2VydmVyLWFyZ3M9XCItc2NyZWVuIDAgJHtzaXplLndpZHRofXgke3NpemUuaGVpZ2h0fXgyNFwiYCk7XG4gIH1cbiAgY29uc3Qgb3B0cyA9IGF3YWl0IGVsZWN0cm9uT3B0cygpO1xuICBjb25zdCBlbGVjdHJvbkFyZ3MgPSBvcHRzLm1hcCgoYSkgPT4gYC0tJHthfWApO1xuICBjb25zdCBiYXNlNjRBcmdzID0gQnVmZmVyLmZyb20oSlNPTi5zdHJpbmdpZnkoYXJncykpLnRvU3RyaW5nKFwiYmFzZTY0XCIpO1xuICBlbGVjdHJvbkFyZ3MucHVzaChgJHtQVVBfQVJHU19LRVl9PSR7YmFzZTY0QXJnc31gKTtcbiAgY21kUGFydHMucHVzaChlbGVjdHJvbiwgLi4uZWxlY3Ryb25BcmdzLCBwdXBBcHApO1xuICBjb25zdCBjbWQgPSBjbWRQYXJ0cy5qb2luKFwiIFwiKTtcbiAgbG9nZ2VyLmRlYnVnKFRBRywgY21kKTtcbiAgcmV0dXJuIGV4ZWMoY21kLCB7XG4gICAgc3RkaW86IFtcImlnbm9yZVwiLCBcInBpcGVcIiwgXCJwaXBlXCJdLFxuICAgIHNoZWxsOiBwbGF0ID09PSBcImxpbnV4XCIsXG4gICAgZW52OiB7IC4uLnByb2Nlc3MuZW52LCBSVVNUX0JBQ0tUUkFDRTogXCJmdWxsXCIgfSxcbiAgfSk7XG59XG4iLCIvLyBDcmVhdGVkIGJ5IEF1dG9rYWthIChxcTE5MDk2OTg0OTRAZ21haWwuY29tKSBvbiAyMDI2LzAyLzA5LlxuXG5pbXBvcnQgeyByZWFkRmlsZSB9IGZyb20gXCJmcy9wcm9taXNlc1wiO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBBYm9ydExpbmssIHR5cGUgQWJvcnRRdWVyeSB9IGZyb20gXCIuL2Jhc2UvYWJvcnRcIjtcbmltcG9ydCB7IENvbmN1cnJlbmN5TGltaXRlciB9IGZyb20gXCIuL2Jhc2UvbGltaXRlclwiO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSBcIi4vYmFzZS9sb2dnaW5nXCI7XG5pbXBvcnQgeyBwYXJzZU51bWJlciB9IGZyb20gXCIuL2Jhc2UvcGFyc2VyXCI7XG5pbXBvcnQgeyBydW5FbGVjdHJvbkFwcCB9IGZyb20gXCIuL3JlbmRlcmVyL2VsZWN0cm9uXCI7XG5pbXBvcnQgeyBERUZBVUxUX0hFSUdIVCwgREVGQVVMVF9XSURUSCwgdHlwZSBSZW5kZXJPcHRpb25zLCB0eXBlIFJlbmRlclJlc3VsdCB9IGZyb20gXCIuL3JlbmRlcmVyL3NjaGVtYVwiO1xuXG5jb25zdCBUQUcgPSBcIltwdXBdXCI7XG5jb25zdCBQUk9HUkVTU19UQUcgPSBcIiBwcm9ncmVzczogXCI7XG5cbmV4cG9ydCB0eXBlIFB1cFByb2dyZXNzQ2FsbGJhY2sgPSAocHJvZ3Jlc3M6IG51bWJlcikgPT4gUHJvbWlzZTx2b2lkPiB8IHZvaWQ7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHVwT3B0aW9ucyBleHRlbmRzIFBhcnRpYWw8UmVuZGVyT3B0aW9ucz4ge1xuICBjYW5jZWxRdWVyeT86IEFib3J0UXVlcnk7XG4gIG9uUHJvZ3Jlc3M/OiBQdXBQcm9ncmVzc0NhbGxiYWNrO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFB1cFJlc3VsdCBleHRlbmRzIFJlbmRlclJlc3VsdCB7fVxuXG5hc3luYyBmdW5jdGlvbiBydW5QdXBBcHAoc291cmNlOiBzdHJpbmcsIG9wdGlvbnM6IFB1cE9wdGlvbnMpIHtcbiAgbG9nZ2VyLmRlYnVnKFRBRywgYHJ1blB1cEFwcGAsIHNvdXJjZSwgb3B0aW9ucyk7XG5cbiAgY29uc3QgYXJnczogc3RyaW5nW10gPSBbc291cmNlXTtcbiAgaWYgKG9wdGlvbnMud2lkdGgpIGFyZ3MucHVzaChcIi0td2lkdGhcIiwgYCR7b3B0aW9ucy53aWR0aH1gKTtcbiAgaWYgKG9wdGlvbnMuaGVpZ2h0KSBhcmdzLnB1c2goXCItLWhlaWdodFwiLCBgJHtvcHRpb25zLmhlaWdodH1gKTtcbiAgaWYgKG9wdGlvbnMuZnBzKSBhcmdzLnB1c2goXCItLWZwc1wiLCBgJHtvcHRpb25zLmZwc31gKTtcbiAgaWYgKG9wdGlvbnMuZHVyYXRpb24pIGFyZ3MucHVzaChcIi0tZHVyYXRpb25cIiwgYCR7b3B0aW9ucy5kdXJhdGlvbn1gKTtcbiAgaWYgKG9wdGlvbnMub3V0RGlyKSBhcmdzLnB1c2goXCItLW91dC1kaXJcIiwgb3B0aW9ucy5vdXREaXIpO1xuICBpZiAob3B0aW9ucy5mb3JtYXRzPy5sZW5ndGgpIGFyZ3MucHVzaChcIi0tZm9ybWF0c1wiLCBvcHRpb25zLmZvcm1hdHMuam9pbihcIixcIikpO1xuICBpZiAob3B0aW9ucy53aXRoQXVkaW8pIGFyZ3MucHVzaChcIi0td2l0aC1hdWRpb1wiKTtcbiAgaWYgKG9wdGlvbnMudXNlSW5uZXJQcm94eSkgYXJncy5wdXNoKFwiLS11c2UtaW5uZXItcHJveHlcIik7XG4gIGlmIChvcHRpb25zLmRldGVybWluaXN0aWMpIGFyZ3MucHVzaChcIi0tZGV0ZXJtaW5pc3RpY1wiKTtcblxuICBjb25zdCB3ID0gb3B0aW9ucy53aWR0aCA/PyBERUZBVUxUX1dJRFRIO1xuICBjb25zdCBoID0gb3B0aW9ucy5oZWlnaHQgPz8gREVGQVVMVF9IRUlHSFQ7XG4gIGNvbnN0IGhhbmRsZSA9IGF3YWl0IHJ1bkVsZWN0cm9uQXBwKHsgd2lkdGg6IHcsIGhlaWdodDogaCB9LCBhcmdzKTtcbiAgY29uc3QgY291bnRlciA9IG5ldyBDb25jdXJyZW5jeUxpbWl0ZXIoMSk7XG4gIGhhbmRsZS5wcm9jZXNzLnN0ZG91dD8ub24oXCJkYXRhXCIsIChkYXRhOiBCdWZmZXIpID0+IHtcbiAgICBsZXQgbWVzc2FnZSA9IGRhdGEudG9TdHJpbmcoKS50cmltKCk7XG4gICAgbGV0IHN0YXJ0ID0gbWVzc2FnZS5pbmRleE9mKFBST0dSRVNTX1RBRyk7XG4gICAgaWYgKHN0YXJ0IDwgMCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBtZXNzYWdlID0gbWVzc2FnZS5zbGljZShzdGFydCArIFBST0dSRVNTX1RBRy5sZW5ndGgpO1xuICAgIGNvbnN0IGVuZCA9IG1lc3NhZ2UuaW5kZXhPZihcIiVcIik7XG4gICAgaWYgKGVuZCA8IDApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgcHJvZ3Jlc3NTdHIgPSBtZXNzYWdlLnNsaWNlKDAsIGVuZCk7XG4gICAgY29uc3QgcHJvZ3Jlc3MgPSBwYXJzZU51bWJlcihwcm9ncmVzc1N0cik7XG4gICAgY291bnRlci5zY2hlZHVsZShhc3luYyAoKSA9PiB7XG4gICAgICBhd2FpdCBvcHRpb25zLm9uUHJvZ3Jlc3M/Lihwcm9ncmVzcyk7XG4gICAgfSk7XG4gIH0pO1xuICByZXR1cm4geyBoYW5kbGUsIGNvdW50ZXIgfTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHB1cChzb3VyY2U6IHN0cmluZywgb3B0aW9uczogUHVwT3B0aW9ucyk6IFByb21pc2U8UHVwUmVzdWx0PiB7XG4gIGxvZ2dlci5kZWJ1ZyhUQUcsIGBwdXBgLCBzb3VyY2UsIG9wdGlvbnMpO1xuXG4gIGNvbnN0IGxpbmsgPSBBYm9ydExpbmsuc3RhcnQob3B0aW9ucy5jYW5jZWxRdWVyeSk7XG4gIGNvbnN0IG91dERpciA9IG9wdGlvbnMub3V0RGlyID8/IFwib3V0XCI7XG5cbiAgY29uc3QgdDAgPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgY29uc3QgeyBoYW5kbGUsIGNvdW50ZXIgfSA9IGF3YWl0IHJ1blB1cEFwcChzb3VyY2UsIHsgLi4ub3B0aW9ucywgb3V0RGlyIH0pO1xuXG4gIGF3YWl0IGxpbmsud2FpdChoYW5kbGUpO1xuICBhd2FpdCBjb3VudGVyLmVuZCgpO1xuICBsaW5rLnN0b3AoKTtcbiAgbG9nZ2VyLmluZm8oVEFHLCBgZG9uZSBpbiAke01hdGgucm91bmQocGVyZm9ybWFuY2Uubm93KCkgLSB0MCl9bXNgKTtcblxuICBjb25zdCBzdW1QYXRoID0gam9pbihvdXREaXIsIFwic3VtbWFyeS5qc29uXCIpO1xuICByZXR1cm4gSlNPTi5wYXJzZShhd2FpdCByZWFkRmlsZShzdW1QYXRoLCBcInV0Zi04XCIpKSBhcyBSZW5kZXJSZXN1bHQ7XG59XG4iXX0=