import 'source-map-support/register.js';
import { spawn } from 'child_process';
import z from 'zod';
import { readdir, readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { ok } from 'assert';
import electron from 'electron';
import { existsSync } from 'fs';
import { platform } from 'os';
import { fileURLToPath } from 'url';
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

// src/base/constants.ts
var env = process.env;
var pupLogLevel = penv("PUP_LOG_LEVEL", parseNumber, 2);
var pupUseInnerProxy = env["PUP_USE_INNER_PROXY"] === "1";
var pupDisableGPU = env["PUP_DISABLE_GPU"] === "1";

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
var basedir = dirname(fileURLToPath(import.meta.url));
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
var appSearchPaths = [
  join(basedir, "app.cjs"),
  // process from dist
  join(basedir, "../../dist/app.cjs")
  // process from src
];
var app = appSearchPaths.find(existsSync);
ok(app, "Cannot load electron app");
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
  cmdParts.push(electron, ...electronArgs, app);
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

export { AbortLink, ConcurrencyLimiter, DEFAULT_DURATION, DEFAULT_FPS, DEFAULT_HEIGHT, DEFAULT_OUT_DIR, DEFAULT_WIDTH, Logger, PUP_ARGS_KEY, RenderSchema, VIDEO_FORMATS, __callDispose, __using, exec, isVideoFormat, logger, noerr, pargs, parseNumber, parseString, penv, pup, pupDisableGPU, pupLogLevel, pupUseInnerProxy };
//# sourceMappingURL=chunk-A5IYURQQ.js.map
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9iYXNlL2Vudi50cyIsIi4uL3NyYy9iYXNlL3BhcnNlci50cyIsIi4uL3NyYy9iYXNlL2NvbnN0YW50cy50cyIsIi4uL3NyYy9iYXNlL2xvZ2dpbmcudHMiLCIuLi9zcmMvYmFzZS9ub2Vyci50cyIsIi4uL3NyYy9iYXNlL3Byb2Nlc3MudHMiLCIuLi9zcmMvcmVuZGVyZXIvc2NoZW1hLnRzIiwiLi4vc3JjL2Jhc2UvYWJvcnQudHMiLCIuLi9zcmMvYmFzZS9saW1pdGVyLnRzIiwiLi4vc3JjL2Jhc2UvYmFzZWRpci50cyIsIi4uL3NyYy9iYXNlL2h3YWNjZWwudHMiLCIuLi9zcmMvcmVuZGVyZXIvZWxlY3Ryb24udHMiLCIuLi9zcmMvcHVwLnRzIl0sIm5hbWVzIjpbInBsYXRmb3JtIiwiVEFHIiwiam9pbiJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFNTyxTQUFTLElBQUEsQ0FBUSxJQUFBLEVBQWMsTUFBQSxFQUFzQixZQUFBLEVBQWlDO0FBQzNGLEVBQUEsSUFBSTtBQUNGLElBQUEsT0FBTyxNQUFBLENBQU8sT0FBQSxDQUFRLEdBQUEsQ0FBSSxJQUFJLENBQUMsQ0FBQTtBQUFBLEVBQ2pDLENBQUEsQ0FBQSxNQUFRO0FBQ04sSUFBQSxPQUFPLFlBQUE7QUFBQSxFQUNUO0FBQ0Y7OztBQ1ZPLFNBQVMsWUFBWSxDQUFBLEVBQW9CO0FBQzlDLEVBQUEsSUFBSSxPQUFPLE1BQU0sUUFBQSxFQUFVO0FBQ3pCLElBQUEsT0FBTyxDQUFBO0FBQUEsRUFDVDtBQUNBLEVBQUEsTUFBTSxHQUFBLEdBQU0sT0FBTyxDQUFDLENBQUE7QUFDcEIsRUFBQSxJQUFJLE1BQUEsQ0FBTyxLQUFBLENBQU0sR0FBRyxDQUFBLEVBQUc7QUFDckIsSUFBQSxNQUFNLElBQUksS0FBQSxDQUFNLENBQUEsTUFBQSxFQUFTLENB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QVEsV0FBVyxDQUFBO0FBQ2hELEVBQUEsTUFBTSxNQUFBLEdBQVMsUUFBUSxNQUFBLElBQVUsS0FBQTtBQUVqQyxFQUFBLE1BQU0sRUFBQSxHQUFLLFlBQVksR0FBQSxFQUFJO0FBQzNCLEVBQUEsTUFBTSxFQUFFLE1BQUEsRUFBUSxPQUFBLEVBQVEsR0FBSSxNQUFNLFNBQUEsQ0FBVSxNQUFBLEVBQVEsRUFBRSxHQUFHLE9BQUEsRUFBUyxNQUFBLEVBQVEsQ0FBQTtBQUUxRSxFQUFBLE1BQU0sSUFBQSxDQUFLLEtBQUssTUFBTSxDQUFBO0FBQ3RCLEVBQUEsTUFBTSxRQUFRLEdBQUEsRUFBSTtBQUNsQixFQUFBLElBQUEsQ0FBSyxJQUFBLEVBQUs7QUFDVixFQUFBLE1BQUEsQ0FBTyxJQUFBLENBQUtBLElBQUFBLEVBQUssQ0FBQSxRQUFBLEVBQVcsSUFBQSxDQUFLLEtBQUEsQ0FBTSxZQUFZLEdBQUEsRUFBSSxHQUFJLEVBQUUsQ0FBQyxDQUFBLEVBQUEsQ0FBSSxDQUFBO0FBRWxFLEVBQUEsTUFBTSxPQUFBLEdBQVVDLElBQUFBLENBQUssTUFBQSxFQUFRLGNBQWMsQ0FBQTtBQUMzQyxFQUFBLE9BQU8sS0FBSyxLQUFBLENBQU0sTUFBTSxRQUFBLENBQVMsT0FBQSxFQUFTLE9BQU8sQ0FBQyxDQUFBO0FBQ3BEIiwiZmlsZSI6ImNodW5rLUE1SVlVUlFRLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLy8gQ3JlYXRlZCBieSBBdXRva2FrYSAocXExOTA5Njk4NDk0QGdtYWlsLmNvbSkgb24gMjAyNi8wMi8yNS5cblxuZXhwb3J0IHR5cGUgRW52UGFyc2VyPFQ+ID0gKHZhbHVlOiB1bmtub3duKSA9PiBUO1xuXG5leHBvcnQgZnVuY3Rpb24gcGVudjxUPihuYW1lOiBzdHJpbmcsIHBhcnNlcjogRW52UGFyc2VyPFQ+LCBkZWZhdWx0VmFsdWU6IFQpOiBUO1xuZXhwb3J0IGZ1bmN0aW9uIHBlbnY8VD4obmFtZTogc3RyaW5nLCBwYXJzZXI6IEVudlBhcnNlcjxUPiwgZGVmYXVsdFZhbHVlPzogVCk6IFQgfCB1bmRlZmluZWQ7XG5leHBvcnQgZnVuY3Rpb24gcGVudjxUPihuYW1lOiBzdHJpbmcsIHBhcnNlcjogRW52UGFyc2VyPFQ+LCBkZWZhdWx0VmFsdWU/OiBUKTogVCB8IHVuZGVmaW5lZCB7XG4gIHRyeSB7XG4gICAgcmV0dXJuIHBhcnNlcihwcm9jZXNzLmVudltuYW1lXSk7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBkZWZhdWx0VmFsdWU7XG4gIH1cbn1cbiIsIi8vIENyZWF0ZWQgYnkgQXV0b2tha2EgKHFxMTkwOTY5ODQ5NEBnbWFpbC5jb20pIG9uIDIwMjYvMDEvMzAuXG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZU51bWJlcih4OiB1bmtub3duKTogbnVtYmVyIHtcbiAgaWYgKHR5cGVvZiB4ID09PSBcIm51bWJlclwiKSB7XG4gICAgcmV0dXJuIHg7XG4gIH1cbiAgY29uc3QgbnVtID0gTnVtYmVyKHgpO1xuICBpZiAoTnVtYmVyLmlzTmFOKG51bSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYFZhbHVlICR7eH0gaXMgbm90IGEgdmFsaWQgbnVtYmVyYCk7XG4gIH1cbiAgcmV0dXJuIG51bTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlU3RyaW5nKHg6IHVua25vd24pOiBzdHJpbmcge1xuICBpZiAodHlwZW9mIHggPT09IFwic3RyaW5nXCIpIHJldHVybiB4O1xuICByZXR1cm4gU3RyaW5nKHgpO1xufVxuIiwiLy8gQ3JlYXRlZCBieSBBdXRva2FrYSAocXExOTA5Njk4NDk0QGdtYWlsLmNvbSkgb24gMjAyNi8wMi8wOS5cblxuaW1wb3J0IHsgcGVudiB9IGZyb20gXCIuL2VudlwiO1xuaW1wb3J0IHsgcGFyc2VOdW1iZXIgfSBmcm9tIFwiLi9wYXJzZXJcIjtcblxuY29uc3QgZW52ID0gcHJvY2Vzcy5lbnY7XG5leHBvcnQgY29uc3QgcHVwTG9nTGV2ZWwgPSBwZW52KFwiUFVQX0xPR19MRVZFTFwiLCBwYXJzZU51bWJlciwgMik7XG5leHBvcnQgY29uc3QgcHVwVXNlSW5uZXJQcm94eSA9IGVudltcIlBVUF9VU0VfSU5ORVJfUFJPWFlcIl0gPT09IFwiMVwiO1xuZXhwb3J0IGNvbnN0IHB1cERpc2FibGVHUFUgPSBlbnZbXCJQVVBfRElTQUJMRV9HUFVcIl0gPT09IFwiMVwiO1xuIiwiLy8gQ3JlYXRlZCBieSBBdXRva2FrYSAocXExOTA5Njk4NDk0QGdtYWlsLmNvbSkgb24gMjAyNi8wMi8wNi5cblxuaW1wb3J0IHsgQ2hpbGRQcm9jZXNzLCB0eXBlIFNlcmlhbGl6YWJsZSB9IGZyb20gXCJjaGlsZF9wcm9jZXNzXCI7XG5pbXBvcnQgeyBwdXBMb2dMZXZlbCB9IGZyb20gXCIuL2NvbnN0YW50c1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIExvZ2dlckxpa2Uge1xuICBkZWJ1Zz8odGhpczogdm9pZCwgLi4ubWVzc2FnZXM6IHVua25vd25bXSk6IHZvaWQ7XG5cbiAgaW5mbz8odGhpczogdm9pZCwgLi4ubWVzc2FnZXM6IHVua25vd25bXSk6IHZvaWQ7XG5cbiAgd2Fybj8odGhpczogdm9pZCwgLi4ubWVzc2FnZXM6IHVua25vd25bXSk6IHZvaWQ7XG5cbiAgZXJyb3I/KHRoaXM6IHZvaWQsIC4uLm1lc3NhZ2VzOiB1bmtub3duW10pOiB2b2lkO1xufVxuXG5jb25zdCBERUJVRyA9IFwiPHB1cEBkZWJ1Zz5cIjtcbmNvbnN0IElORk8gPSBcIjxwdXBAaW5mbz5cIjtcbmNvbnN0IFdBUk4gPSBcIjxwdXBAd2Fybj5cIjtcbmNvbnN0IEVSUk9SID0gXCI8cHVwQGVycm9yPlwiO1xuY29uc3QgRkFUQUwgPSBcIjxwdXBAZmF0YWw+XCI7XG5cbmZ1bmN0aW9uIHN0YWNrSG9vayh0YXJnZXQ6IEZ1bmN0aW9uLCBfY29udGV4dDogQ2xhc3NNZXRob2REZWNvcmF0b3JDb250ZXh0KSB7XG4gIHJldHVybiBmdW5jdGlvbiAodGhpczogTG9nZ2VyLCAuLi5tZXNzYWdlczogdW5rbm93bltdKSB7XG4gICAgY29uc3QgcHJvY2Vzc2VkID0gbWVzc2FnZXMubWFwKChtc2cpID0+IHtcbiAgICAgIHJldHVybiBtc2cgaW5zdGFuY2VvZiBFcnJvciA/IChtc2cuc3RhY2sgPz8gU3RyaW5nKG1zZykpIDogbXNnO1xuICAgIH0pO1xuICAgIHJldHVybiB0YXJnZXQuY2FsbCh0aGlzLCAuLi5wcm9jZXNzZWQpO1xuICB9O1xufVxuXG5leHBvcnQgY2xhc3MgTG9nZ2VyIGltcGxlbWVudHMgTG9nZ2VyTGlrZSB7XG4gIHByaXZhdGUgX2ltcGw/OiBMb2dnZXJMaWtlO1xuXG4gIGdldCBsZXZlbCgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLl9sZXZlbDtcbiAgfVxuXG4gIHNldCBsZXZlbCh2YWx1ZTogbnVtYmVyKSB7XG4gICAgdGhpcy5fbGV2ZWwgPSB2YWx1ZTtcbiAgICB0aGlzLmltcGwgPSB0aGlzLl9pbXBsID8/IGNvbnNvbGU7XG4gIH1cblxuICBnZXQgaW1wbCgpOiBMb2dnZXJMaWtlIHwgdW5kZWZpbmVkIHtcbiAgICByZXR1cm4gdGhpcy5faW1wbDtcbiAgfVxuXG4gIHNldCBpbXBsKHZhbHVlOiBMb2dnZXJMaWtlKSB7XG4gICAgY29uc3QgZGVidWcgPSB2YWx1ZS5kZWJ1ZyA/PyBjb25zb2xlLmRlYnVnO1xuICAgIGNvbnN0IGluZm8gPSB2YWx1ZS5pbmZvID8/IGNvbnNvbGUuaW5mbztcbiAgICBjb25zdCB3YXJuID0gdmFsdWUud2FybiA/PyBjb25zb2xlLndhcm47XG4gICAgY29uc3QgZXJyb3IgPSB2YWx1ZS5lcnJvciA/PyBjb25zb2xlLmVycm9yO1xuICAgIGNvbnN0IGx2ID0gdGhpcy5fbGV2ZWw7XG4gICAgdGhpcy5faW1wbCA9IHtcbiAgICAgIGRlYnVnOiBsdiA+PSAzID8gZGVidWcgOiB1bmRlZmluZWQsXG4gICAgICBpbmZvOiBsdiA+PSAyID8gaW5mbyA6IHVuZGVmaW5lZCxcbiAgICAgIHdhcm46IGx2ID49IDEgPyB3YXJuIDogdW5kZWZpbmVkLFxuICAgICAgZXJyb3I6IGx2ID49IDAgPyBlcnJvciA6IHVuZGVmaW5lZCxcbiAgICB9O1xuICB9XG5cbiAgY29uc3RydWN0b3IocHJpdmF0ZSBfbGV2ZWw6IG51bWJlciA9IHB1cExvZ0xldmVsKSB7XG4gICAgdGhpcy5pbXBsID0gY29uc29sZTtcbiAgfVxuXG4gIEBzdGFja0hvb2tcbiAgZGVidWcoLi4ubWVzc2FnZXM6IHVua25vd25bXSk6IHZvaWQge1xuICAgIHRoaXMuaW1wbD8uZGVidWc/LihERUJVRywgLi4ubWVzc2FnZXMpO1xuICB9XG5cbiAgQHN0YWNrSG9va1xuICBpbmZvKC4uLm1lc3NhZ2VzOiB1bmtub3duW10pOiB2b2lkIHtcbiAgICB0aGlzLmltcGw/LmluZm8/LihJTkZPLCAuLi5tZXNzYWdlcyk7XG4gIH1cblxuICBAc3RhY2tIb29rXG4gIHdhcm4oLi4ubWVzc2FnZXM6IHVua25vd25bXSk6IHZvaWQge1xuICAgIHRoaXMuaW1wbD8ud2Fybj8uKFdBUk4sIC4uLm1lc3NhZ2VzKTtcbiAgfVxuXG4gIEBzdGFja0hvb2tcbiAgZXJyb3IoLi4ubWVzc2FnZXM6IHVua25vd25bXSk6IHZvaWQge1xuICAgIHRoaXMuaW1wbD8uZXJyb3I/LihFUlJPUiwgLi4ubWVzc2FnZXMpO1xuICB9XG5cbiAgQHN0YWNrSG9va1xuICBmYXRhbCguLi5tZXNzYWdlczogdW5rbm93bltdKTogdm9pZCB7XG4gICAgdGhpcy5pbXBsPy5lcnJvcj8uKEZBVEFMLCAuLi5tZXNzYWdlcyk7XG4gICAgcHJvY2Vzcy5leGl0KDEpO1xuICB9XG5cbiAgcHJpdmF0ZSBkaXNwYXRjaChtZXNzYWdlOiBzdHJpbmcpIHtcbiAgICBpZiAobWVzc2FnZS5zdGFydHNXaXRoKERFQlVHKSkge1xuICAgICAgdGhpcy5kZWJ1ZyhtZXNzYWdlLnNsaWNlKERFQlVHLmxlbmd0aCArIDEpKTtcbiAgICB9IGVsc2UgaWYgKG1lc3NhZ2Uuc3RhcnRzV2l0aChJTkZPKSkge1xuICAgICAgdGhpcy5pbmZvKG1lc3NhZ2Uuc2xpY2UoSU5GTy5sZW5ndGggKyAxKSk7XG4gICAgfSBlbHNlIGlmIChtZXNzYWdlLnN0YXJ0c1dpdGgoV0FSTikpIHtcbiAgICAgIHRoaXMud2FybihtZXNzYWdlLnNsaWNlKFdBUk4ubGVuZ3RoICsgMSkpO1xuICAgIH0gZWxzZSBpZiAobWVzc2FnZS5zdGFydHNXaXRoKEVSUk9SKSkge1xuICAgICAgdGhpcy5lcnJvcihtZXNzYWdlLnNsaWNlKEVSUk9SLmxlbmd0aCArIDEpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5pbmZvKG1lc3NhZ2UpO1xuICAgIH1cbiAgfVxuXG4gIGF0dGFjaChwcm9jOiBDaGlsZFByb2Nlc3MsIG5hbWU6IHN0cmluZykge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB0aGlzLmRlYnVnKGAke25hbWV9LmF0dGFjaGApO1xuICAgICAgbGV0IGZhdGFsOiBzdHJpbmcgPSBcIlwiO1xuICAgICAgY29uc3QgZGlzcGF0Y2ggPSAoZGF0YTogQnVmZmVyIHwgU2VyaWFsaXphYmxlKSA9PiB7XG4gICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBkYXRhLnRvU3RyaW5nKCk7XG4gICAgICAgIGlmIChtZXNzYWdlLnN0YXJ0c1dpdGgoRkFUQUwpKSB7XG4gICAgICAgICAgZmF0YWwgKz0gbWVzc2FnZS5zbGljZShGQVRBTC5sZW5ndGggKyAxKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGlzLmRpc3BhdGNoKG1lc3NhZ2UpO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgcHJvYy5zdGRlcnI/Lm9uKFwiZGF0YVwiLCBkaXNwYXRjaCk7XG4gICAgICBwcm9jLnN0ZG91dD8ub24oXCJkYXRhXCIsIGRpc3BhdGNoKTtcbiAgICAgIHByb2NcbiAgICAgICAgLm9uKFwibWVzc2FnZVwiLCBkaXNwYXRjaClcbiAgICAgICAgLm9uKFwiZXJyb3JcIiwgKGVycikgPT4ge1xuICAgICAgICAgIGZhdGFsICs9IGVyci5tZXNzYWdlO1xuICAgICAgICAgIHByb2Mua2lsbCgpO1xuICAgICAgICB9KVxuICAgICAgICAub25jZShcImNsb3NlXCIsIChjb2RlLCBzaWduYWwpID0+IHtcbiAgICAgICAgICBpZiAoY29kZSB8fCBzaWduYWwgfHwgZmF0YWwpIHtcbiAgICAgICAgICAgIGZhdGFsIHx8PSBgY29tbWFuZCBmYWlsZWQ6ICR7cHJvYy5zcGF3bmFyZ3Muam9pbihcIiBcIil9YDtcbiAgICAgICAgICAgIHRoaXMuZGVidWcoYCR7bmFtZX0uY2xvc2VgLCB7IGNvZGUsIHNpZ25hbCwgZmF0YWwgfSk7XG4gICAgICAgICAgICByZWplY3QobmV3IEVycm9yKGZhdGFsKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuZGVidWcoYCR7bmFtZX0uY2xvc2VgKTtcbiAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICAgIC5vbihcInVuaGFuZGxlZFJlamVjdGlvblwiLCAocmVhc29uKSA9PiB7XG4gICAgICAgICAgdGhpcy5lcnJvcihgJHtuYW1lfS51bmhhbmRsZWRgLCByZWFzb24pO1xuICAgICAgICB9KVxuICAgICAgICAub24oXCJ1bmNhdWdodEV4Y2VwdGlvbk1vbml0b3JcIiwgKGVycikgPT4ge1xuICAgICAgICAgIHRoaXMuZXJyb3IoYCR7bmFtZX0udW5oYW5kbGVkYCwgZXJyKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbn1cblxuY29uc3QgbG9nZ2VyID0gbmV3IExvZ2dlcigpO1xuXG5leHBvcnQgeyBsb2dnZXIgfTtcbiIsIi8vIENyZWF0ZWQgYnkgQXV0b2tha2EgKHFxMTkwOTY5ODQ5NEBnbWFpbC5jb20pIG9uIDIwMjYvMDIvMjQuXG5cbmV4cG9ydCBmdW5jdGlvbiBub2VycjxGbiBleHRlbmRzICguLi5hcmdzOiBhbnlbXSkgPT4gYW55LCBEPihcbiAgZm46IEZuLFxuICBkZWZhdWx0VmFsdWU6IEQsXG4pOiAoLi4uYXJnczogUGFyYW1ldGVyczxGbj4pID0+IFJldHVyblR5cGU8Rm4+IHwgRCB7XG4gIHJldHVybiAoLi4uYXJncykgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXQgPSBmbiguLi5hcmdzKTtcbiAgICAgIGlmIChyZXQgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgIHJldHVybiByZXQuY2F0Y2goKCkgPT4gZGVmYXVsdFZhbHVlKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXQ7XG4gICAgfSBjYXRjaCB7XG4gICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgIH1cbiAgfTtcbn1cbiIsIi8vIENyZWF0ZWQgYnkgQXV0b2tha2EgKHFxMTkwOTY5ODQ5NEBnbWFpbC5jb20pIG9uIDIwMjYvMDEvMzAuXG5cbmltcG9ydCB7IHNwYXduLCB0eXBlIENoaWxkUHJvY2VzcywgdHlwZSBTcGF3bk9wdGlvbnMgfSBmcm9tIFwiY2hpbGRfcHJvY2Vzc1wiO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSBcIi4vbG9nZ2luZ1wiO1xuXG5leHBvcnQgY29uc3QgUFVQX0FSR1NfS0VZID0gXCItLXB1cC1wcml2LWFyZ3NcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIHBhcmdzKCkge1xuICBjb25zdCBhcmd2ID0gcHJvY2Vzcy5hcmd2O1xuICBsZXQgcHJpdiA9IGFyZ3YuZmluZCgoYXJnKSA9PiBhcmcuc3RhcnRzV2l0aChQVVBfQVJHU19LRVkpKTtcbiAgaWYgKCFwcml2KSB7XG4gICAgbG9nZ2VyLmRlYnVnKFwicHJvY2FyZ3ZcIiwgYXJndik7XG4gICAgcmV0dXJuIHByb2Nlc3MuYXJndjtcbiAgfVxuICBjb25zdCBhcmdzID0gW1wiZXhlY1wiLCAuLi5hcmd2LnNsaWNlKC0xKV07XG4gIHByaXYgPSBCdWZmZXIuZnJvbShwcml2LnNwbGl0KFwiPVwiKVsxXSEsIFwiYmFzZTY0XCIpLnRvU3RyaW5nKCk7XG4gIGFyZ3MucHVzaCguLi5KU09OLnBhcnNlKHByaXYpKTtcbiAgbG9nZ2VyLmRlYnVnKFwicHVwYXJnc1wiLCBhcmdzKTtcbiAgcmV0dXJuIGFyZ3M7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUHJvY2Vzc0hhbmRsZSB7XG4gIHByb2Nlc3M6IENoaWxkUHJvY2VzcztcbiAgd2FpdDogUHJvbWlzZTx2b2lkPjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGV4ZWMoY21kOiBzdHJpbmcsIG9wdGlvbnM/OiBTcGF3bk9wdGlvbnMpOiBQcm9jZXNzSGFuZGxlIHtcbiAgY29uc3QgcGFydHMgPSBjbWQuc3BsaXQoXCIgXCIpLmZpbHRlcigocykgPT4gcy5sZW5ndGgpO1xuICBjb25zdCBbY29tbWFuZCwgLi4uYXJnc10gPSBwYXJ0cztcbiAgaWYgKCFjb21tYW5kKSB0aHJvdyBuZXcgRXJyb3IoXCJlbXB0eSBjb21tYW5kXCIpO1xuICBjb25zdCBwcm9jID0gc3Bhd24oY29tbWFuZCwgYXJncywge1xuICAgIHN0ZGlvOiBcImluaGVyaXRcIixcbiAgICAuLi5vcHRpb25zLFxuICB9KTtcbiAgcmV0dXJuIHsgcHJvY2VzczogcHJvYywgd2FpdDogbG9nZ2VyLmF0dGFjaChwcm9jLCBjb21tYW5kKSB9O1xufVxuIiwiLy8gQ3JlYXRlZCBieSBBdXRva2FrYSAocXExOTA5Njk4NDk0QGdtYWlsLmNvbSkgb24gMjAyNi8wMi8wNi5cblxuaW1wb3J0IHogZnJvbSBcInpvZFwiO1xuXG5leHBvcnQgaW50ZXJmYWNlIFZpZGVvRmlsZXMge1xuICBjb3Zlcjogc3RyaW5nO1xuICBtcDQ/OiBzdHJpbmc7XG4gIHdlYm0/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX1dJRFRIID0gMTkyMDtcbmV4cG9ydCBjb25zdCBERUZBVUxUX0hFSUdIVCA9IDEwODA7XG5leHBvcnQgY29uc3QgREVGQVVMVF9GUFMgPSAzMDtcbmV4cG9ydCBjb25zdCBERUZBVUxUX0RVUkFUSU9OID0gNTtcbmV4cG9ydCBjb25zdCBERUZBVUxUX09VVF9ESVIgPSBcIm91dFwiO1xuZXhwb3J0IGNvbnN0IFZJREVPX0ZPUk1BVFMgPSBbXCJtcDRcIiwgXCJ3ZWJtXCJdIGFzIGNvbnN0O1xuXG5leHBvcnQgdHlwZSBWaWRlb0Zvcm1hdCA9ICh0eXBlb2YgVklERU9fRk9STUFUUylbbnVtYmVyXTtcblxuZXhwb3J0IGZ1bmN0aW9uIGlzVmlkZW9Gb3JtYXQoczogc3RyaW5nKTogcyBpcyBWaWRlb0Zvcm1hdCB7XG4gIHJldHVybiBWSURFT19GT1JNQVRTLmluY2x1ZGVzKHMgYXMgVmlkZW9Gb3JtYXQpO1xufVxuXG5leHBvcnQgY29uc3QgUmVuZGVyU2NoZW1hID0gei5vYmplY3Qoe1xuICBkdXJhdGlvbjogei5udW1iZXIoKS5vcHRpb25hbCgpLmRlZmF1bHQoREVGQVVMVF9EVVJBVElPTikuZGVzY3JpYmUoXCJEdXJhdGlvbiBpbiBzZWNvbmRzXCIpLFxuICB3aWR0aDogei5udW1iZXIoKS5vcHRpb25hbCgpLmRlZmF1bHQoREVGQVVMVF9XSURUSCkuZGVzY3JpYmUoXCJWaWRlbyB3aWR0aFwiKSxcbiAgaGVpZ2h0OiB6Lm51bWJlcigpLm9wdGlvbmFsKCkuZGVmYXVsdChERUZBVUxUX0hFSUdIVCkuZGVzY3JpYmUoXCJWaWRlbyBoZWlnaHRcIiksXG4gIGZwczogei5udW1iZXIoKS5vcHRpb25hbCgpLmRlZmF1bHQoREVGQVVMVF9GUFMpLmRlc2NyaWJlKFwiRnJhbWVzIHBlciBzZWNvbmRcIiksXG4gIGZvcm1hdHM6IHpcbiAgICAuYXJyYXkoei5lbnVtKFZJREVPX0ZPUk1BVFMpKVxuICAgIC5vcHRpb25hbCgpXG4gICAgLmRlZmF1bHQoW1wibXA0XCJdKVxuICAgIC5kZXNjcmliZShgT3V0cHV0IHZpZGVvIGZvcm1hdHMsIGFsbG93ICR7VklERU9fRk9STUFUUy5qb2luKFwiLCBcIil9YCksXG4gIHdpdGhBdWRpbzogei5ib29sZWFuKCkub3B0aW9uYWwoKS5kZWZhdWx0KGZhbHNlKS5kZXNjcmliZShcIkNhcHR1cmUgYW5kIGVuY29kZSBhdWRpb1wiKSxcbiAgb3V0RGlyOiB6LnN0cmluZygpLm9wdGlvbmFsKCkuZGVmYXVsdChERUZBVUxUX09VVF9ESVIpLmRlc2NyaWJlKFwiT3V0cHV0IGRpcmVjdG9yeVwiKSxcbiAgdXNlSW5uZXJQcm94eTogei5ib29sZWFuKCkub3B0aW9uYWwoKS5kZWZhdWx0KGZhbHNlKS5kZXNjcmliZShcIlVzZSBiaWxpYmlsaSBpbm5lciBwcm94eSBmb3IgcmVzb3VyY2UgYWNjZXNzXCIpLFxuICBkZXRlcm1pbmlzdGljOiB6LmJvb2xlYW4oKS5vcHRpb25hbCgpLmRlZmF1bHQoZmFsc2UpLmRlc2NyaWJlKFwiUmVuZGVyIGJ5IGZyYW1lIHJhdGhlciB0aGFuIHJlY29yZGluZ1wiKSxcbn0pO1xuXG5leHBvcnQgdHlwZSBSZW5kZXJPcHRpb25zID0gei5pbmZlcjx0eXBlb2YgUmVuZGVyU2NoZW1hPjtcblxuZXhwb3J0IGludGVyZmFjZSBSZW5kZXJSZXN1bHQge1xuICBvcHRpb25zOiBSZW5kZXJPcHRpb25zO1xuICB3cml0dGVuOiBudW1iZXI7XG4gIGZpbGVzOiBWaWRlb0ZpbGVzO1xufVxuIiwiLy8gQ3JlYXRlZCBieSBBdXRva2FrYSAocXExOTA5Njk4NDk0QGdtYWlsLmNvbSkgb24gMjAyNi8wMi8xMS5cblxuaW1wb3J0IHR5cGUgeyBQcm9jZXNzSGFuZGxlIH0gZnJvbSBcIi4vcHJvY2Vzc1wiO1xuXG5leHBvcnQgdHlwZSBBc3luY1Rhc2sgPSAoKSA9PiBQcm9taXNlPHZvaWQ+IHwgdm9pZDtcbmV4cG9ydCB0eXBlIEFib3J0UXVlcnkgPSAoKSA9PiBQcm9taXNlPGJvb2xlYW4+IHwgYm9vbGVhbjtcblxuZXhwb3J0IGNsYXNzIEFib3J0TGluayB7XG4gIHByaXZhdGUgX2NhbGxiYWNrPzogQXN5bmNUYXNrO1xuICBwcml2YXRlIF9hYm9ydGVkPzogYm9vbGVhbjtcbiAgcHJpdmF0ZSBfc3RvcHBlZCA9IGZhbHNlO1xuXG4gIHByaXZhdGUgY29uc3RydWN0b3IoXG4gICAgcmVhZG9ubHkgcXVlcnk/OiBBYm9ydFF1ZXJ5LFxuICAgIHJlYWRvbmx5IGludGVydmFsOiBudW1iZXIgPSAxMDAwLFxuICApIHtcbiAgICBpZiAocXVlcnkpIHtcbiAgICAgIHRoaXMudGljaygpO1xuICAgIH1cbiAgfVxuXG4gIHN0YXRpYyBzdGFydChxdWVyeT86IEFib3J0UXVlcnksIGludGVydmFsPzogbnVtYmVyKSB7XG4gICAgcmV0dXJuIG5ldyBBYm9ydExpbmsocXVlcnksIGludGVydmFsKTtcbiAgfVxuXG4gIGdldCBhYm9ydGVkKCkge1xuICAgIHJldHVybiAhdGhpcy5fc3RvcHBlZCAmJiB0aGlzLl9hYm9ydGVkO1xuICB9XG5cbiAgZ2V0IHN0b3BwZWQoKSB7XG4gICAgcmV0dXJuIHRoaXMuX3N0b3BwZWQ7XG4gIH1cblxuICBhc3luYyBvbkFib3J0KGNhbGxiYWNrOiBBc3luY1Rhc2spIHtcbiAgICBpZiAodGhpcy5fYWJvcnRlZCkge1xuICAgICAgYXdhaXQgY2FsbGJhY2soKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fY2FsbGJhY2sgPSBjYWxsYmFjaztcbiAgICB9XG4gIH1cblxuICB3YWl0KC4uLmhhbmRsZXM6IFByb2Nlc3NIYW5kbGVbXSkge1xuICAgIGNvbnN0IGFib3J0ID0gbmV3IFByb21pc2UoKF8sIHJlamVjdCkgPT4ge1xuICAgICAgdGhpcy5vbkFib3J0KGFzeW5jICgpID0+IHtcbiAgICAgICAgaGFuZGxlcy5mb3JFYWNoKChoKSA9PiBoLnByb2Nlc3Mua2lsbCgpKTtcbiAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihcImFib3J0ZWRcIikpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIFByb21pc2UucmFjZShbXG4gICAgICBhYm9ydCxcbiAgICAgIFByb21pc2UuYWxsKGhhbmRsZXMubWFwKChoKSA9PiBoLndhaXQpKSwgLy9cbiAgICBdKTtcbiAgfVxuXG4gIHN0b3AoKSB7XG4gICAgdGhpcy5fc3RvcHBlZCA9IHRydWU7XG4gIH1cblxuICBwcml2YXRlIHRpY2soKSB7XG4gICAgc2V0VGltZW91dChhc3luYyAoKSA9PiB7XG4gICAgICBpZiAodGhpcy5fc3RvcHBlZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0aGlzLl9hYm9ydGVkID0gYXdhaXQgdGhpcy5xdWVyeT8uKCk7XG4gICAgICBpZiAodGhpcy5fc3RvcHBlZCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAodGhpcy5fYWJvcnRlZCkge1xuICAgICAgICBhd2FpdCB0aGlzLl9jYWxsYmFjaz8uKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnRpY2soKTtcbiAgICAgIH1cbiAgICB9LCB0aGlzLmludGVydmFsKTtcbiAgfVxufVxuIiwiLy8gQ3JlYXRlZCBieSBBdXRva2FrYSAocXExOTA5Njk4NDk0QGdtYWlsLmNvbSkgb24gMjAyNi8wMS8zMC5cblxuZXhwb3J0IGNsYXNzIENvbmN1cnJlbmN5TGltaXRlciB7XG4gIHByaXZhdGUgX2FjdGl2ZSA9IDA7XG4gIHByaXZhdGUgX3F1ZXVlOiBWb2lkRnVuY3Rpb25bXSA9IFtdO1xuICBwcml2YXRlIF9lbmRlZCA9IGZhbHNlO1xuXG4gIGNvbnN0cnVjdG9yKHJlYWRvbmx5IG1heENvbmN1cnJlbmN5OiBudW1iZXIpIHt9XG5cbiAgZ2V0IGFjdGl2ZSgpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLl9hY3RpdmU7XG4gIH1cblxuICBnZXQgcGVuZGluZygpOiBudW1iZXIge1xuICAgIHJldHVybiB0aGlzLl9xdWV1ZS5sZW5ndGg7XG4gIH1cblxuICBnZXQgc3RhdHMoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYGFjdGl2ZTogJHt0aGlzLmFjdGl2ZX0sIHBlbmRpbmc6ICR7dGhpcy5wZW5kaW5nfWA7XG4gIH1cblxuICBhc3luYyBzY2hlZHVsZTxUPihmbjogKCkgPT4gUHJvbWlzZTxUPik6IFByb21pc2U8VD4ge1xuICAgIGlmICh0aGlzLl9lbmRlZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiZW5kZWRcIik7XG4gICAgfVxuICAgIHJldHVybiBuZXcgUHJvbWlzZTxUPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCBydW4gPSAoKSA9PiB7XG4gICAgICAgIHRoaXMuX2FjdGl2ZSsrO1xuICAgICAgICBmbigpXG4gICAgICAgICAgLnRoZW4oKHYpID0+IHtcbiAgICAgICAgICAgIHRoaXMuX2FjdGl2ZS0tO1xuICAgICAgICAgICAgcmVzb2x2ZSh2KTtcbiAgICAgICAgICAgIHRoaXMubmV4dCgpO1xuICAgICAgICAgIH0pXG4gICAgICAgICAgLmNhdGNoKChlKSA9PiB7XG4gICAgICAgICAgICB0aGlzLl9hY3RpdmUtLTtcbiAgICAgICAgICAgIHJlamVjdChlKTtcbiAgICAgICAgICAgIHRoaXMubmV4dCgpO1xuICAgICAgICAgIH0pO1xuICAgICAgfTtcbiAgICAgIHRoaXMuX3F1ZXVlLnB1c2gocnVuKTtcbiAgICAgIHRoaXMubmV4dCgpO1xuICAgIH0pO1xuICB9XG5cbiAgYXN5bmMgZW5kKCkge1xuICAgIGlmICh0aGlzLl9lbmRlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl9lbmRlZCA9IHRydWU7XG4gICAgd2hpbGUgKHRoaXMuX2FjdGl2ZSA+IDAgfHwgdGhpcy5wZW5kaW5nID4gMCkge1xuICAgICAgYXdhaXQgbmV3IFByb21pc2UoKHIpID0+IHNldFRpbWVvdXQociwgNTApKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIG5leHQoKSB7XG4gICAgaWYgKHRoaXMuX2FjdGl2ZSA8IHRoaXMubWF4Q29uY3VycmVuY3kpIHtcbiAgICAgIHRoaXMuX3F1ZXVlLnNoaWZ0KCk/LigpO1xuICAgIH1cbiAgfVxufVxuIiwiLy8gQ3JlYXRlZCBieSBBdXRva2FrYSAocXExOTA5Njk4NDk0QGdtYWlsLmNvbSkgb24gMjAyNi8wMi8yNS5cblxuaW1wb3J0IHsgZGlybmFtZSB9IGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSBcInVybFwiO1xuXG5leHBvcnQgY29uc3QgYmFzZWRpciA9IGRpcm5hbWUoZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpKTtcbiIsIi8vIENyZWF0ZWQgYnkgQXV0b2tha2EgKHFxMTkwOTY5ODQ5NEBnbWFpbC5jb20pIG9uIDIwMjYvMDIvMjcuXG5cbmltcG9ydCB7IHJlYWRkaXIgfSBmcm9tIFwiZnMvcHJvbWlzZXNcIjtcbmltcG9ydCB7IHBsYXRmb3JtIH0gZnJvbSBcIm9zXCI7XG5pbXBvcnQgeyBncmFwaGljcyB9IGZyb20gXCJzeXN0ZW1pbmZvcm1hdGlvblwiO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSBcIi4vbG9nZ2luZ1wiO1xuXG5jb25zdCBUQUcgPSBcIltIV0FjY2VsXVwiO1xuXG5jb25zdCBzb2Z0d2FyZVZlbmRvcnMgPSBbXCJtaWNyb3NvZnRcIiwgXCJ2bXdhcmVcIiwgXCJ2aXJ0dWFsYm94XCIsIFwibGx2bXBpcGVcIiwgXCJzb2Z0cGlwZVwiLCBcInN3aWZ0c2hhZGVyXCJdO1xuXG5mdW5jdGlvbiBpc1NvZnR3YXJlUmVuZGVyZXIodmVuZG9yOiBzdHJpbmcpIHtcbiAgY29uc3QgbG93ZXIgPSB2ZW5kb3IudG9Mb3dlckNhc2UoKTtcbiAgcmV0dXJuIHNvZnR3YXJlVmVuZG9ycy5zb21lKCh2KSA9PiBsb3dlci5pbmNsdWRlcyh2KSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGRldGVjdEdQVURyaXZlcigpIHtcbiAgY29uc3QgeyBjb250cm9sbGVycyB9ID0gYXdhaXQgZ3JhcGhpY3MoKTtcbiAgaWYgKHBsYXRmb3JtKCkgPT09IFwibGludXhcIikge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBmaWxlcyA9IGF3YWl0IHJlYWRkaXIoXCIvZGV2L2RyaVwiKTtcbiAgICAgIHJldHVybiBmaWxlcy5zb21lKChmKSA9PiBmLnN0YXJ0c1dpdGgoXCJyZW5kZXJEXCIpKTtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbiAgbG9nZ2VyLmRlYnVnKFRBRywgXCJHUFUgY29udHJvbGxlcnM6XCIsIGNvbnRyb2xsZXJzKTtcbiAgcmV0dXJuIGNvbnRyb2xsZXJzLnNvbWUoKGMpID0+IGMudmVuZG9yLmxlbmd0aCA+IDAgJiYgIWlzU29mdHdhcmVSZW5kZXJlcihjLnZlbmRvcikpO1xufVxuXG5leHBvcnQgY29uc3QgY2FuSVVzZUdQVSA9IGRldGVjdEdQVURyaXZlcigpLnRoZW4oKHJlc3VsdCkgPT4ge1xuICBsb2dnZXIuZGVidWcoVEFHLCBcImdwdTpcIiwgcmVzdWx0KTtcbiAgcmV0dXJuIHJlc3VsdDtcbn0pO1xuIiwiLy8gQ3JlYXRlZCBieSBBdXRva2FrYSAocXExOTA5Njk4NDk0QGdtYWlsLmNvbSkgb24gMjAyNi8wMi8yNS5cblxuaW1wb3J0IHsgb2sgfSBmcm9tIFwiYXNzZXJ0XCI7XG5pbXBvcnQgZWxlY3Ryb24sIHsgdHlwZSBTaXplIH0gZnJvbSBcImVsZWN0cm9uXCI7XG5pbXBvcnQgeyBleGlzdHNTeW5jIH0gZnJvbSBcImZzXCI7XG5pbXBvcnQgeyBwbGF0Zm9ybSB9IGZyb20gXCJvc1wiO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBiYXNlZGlyIH0gZnJvbSBcIi4uL2Jhc2UvYmFzZWRpclwiO1xuaW1wb3J0IHsgcHVwRGlzYWJsZUdQVSwgcHVwTG9nTGV2ZWwgfSBmcm9tIFwiLi4vYmFzZS9jb25zdGFudHNcIjtcbmltcG9ydCB7IGNhbklVc2VHUFUgfSBmcm9tIFwiLi4vYmFzZS9od2FjY2VsXCI7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tIFwiLi4vYmFzZS9sb2dnaW5nXCI7XG5pbXBvcnQgeyBleGVjLCBQVVBfQVJHU19LRVkgfSBmcm9tIFwiLi4vYmFzZS9wcm9jZXNzXCI7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBlbGVjdHJvbk9wdHMoKSB7XG4gIGNvbnN0IG9wdHMgPSBbXG4gICAgLy8g5a655Zmo5rKZ566xXG4gICAgXCJuby1zYW5kYm94XCIsXG4gICAgXCJkaXNhYmxlLWRldi1zaG0tdXNhZ2VcIixcbiAgICAvLyDot6jln58v5a6J5YWoXG4gICAgXCJkaXNhYmxlLXdlYi1zZWN1cml0eVwiLFxuICAgIFwiZGlzYWJsZS1zaXRlLWlzb2xhdGlvbi10cmlhbHNcIixcbiAgICBcImlnbm9yZS1jZXJ0aWZpY2F0ZS1lcnJvcnNcIixcbiAgICAvLyDlvZXliLbooYzkuLpcbiAgICBcImRpc2FibGUtYmxpbmstZmVhdHVyZXM9QXV0b21hdGlvbkNvbnRyb2xsZWRcIixcbiAgICBcIm11dGUtYXVkaW9cIixcbiAgICBcImF1dG9wbGF5LXBvbGljeT1uby11c2VyLWdlc3R1cmUtcmVxdWlyZWRcIixcbiAgICBcImRpc2FibGUtZXh0ZW5zaW9uc1wiLFxuICAgIC8vIOa4suafk1xuICAgIFwiaGVhZGxlc3M9bmV3XCIsXG4gICAgXCJmb3JjZS1kZXZpY2Utc2NhbGUtZmFjdG9yPTFcIixcbiAgICBcImZvcmNlLWNvbG9yLXByb2ZpbGU9c3JnYlwiLFxuICAgIFwiaWdub3JlLWdwdS1ibG9ja2xpc3RcIixcbiAgICBcInVzZS1nbD1hbmdsZVwiLFxuICAgIC8vIOi1hOa6kOaOp+WItlxuICAgIFwibnVtLXJhc3Rlci10aHJlYWRzPTJcIixcbiAgICBcImRpc2FibGUtYmFja2dyb3VuZC1uZXR3b3JraW5nXCIsXG4gICAgXCJqcy1mbGFncz0tLW1heC1vbGQtc3BhY2Utc2l6ZT00MDk2XCIsXG4gIF07XG4gIGlmIChwdXBMb2dMZXZlbCA8IDMpIHtcbiAgICBvcHRzLnB1c2goXCJsb2ctbGV2ZWw9M1wiKTtcbiAgfVxuXG4gIGNvbnN0IGVuYWJsZUdwdSA9IChhd2FpdCBjYW5JVXNlR1BVKSAmJiAhcHVwRGlzYWJsZUdQVTtcbiAgaWYgKCFlbmFibGVHcHUpIHtcbiAgICBvcHRzLnB1c2goXCJ1c2UtYW5nbGU9c3dpZnRzaGFkZXJcIiwgXCJlbmFibGUtdW5zYWZlLXN3aWZ0c2hhZGVyXCIpO1xuICAgIHJldHVybiBvcHRzO1xuICB9XG5cbiAgb3B0cy5wdXNoKFwiZGlzYWJsZS1ncHUtc2FuZGJveFwiLCBcImVuYWJsZS11bnNhZmUtd2ViZ3B1XCIpO1xuICBjb25zdCBwbGF0ID0gcGxhdGZvcm0oKTtcbiAgaWYgKHBsYXQgPT09IFwiZGFyd2luXCIpIHtcbiAgICBvcHRzLnB1c2goXCJ1c2UtYW5nbGU9bWV0YWxcIik7XG4gIH0gZWxzZSBpZiAocGxhdCA9PT0gXCJ3aW4zMlwiKSB7XG4gICAgb3B0cy5wdXNoKFwidXNlLWFuZ2xlPWQzZDExXCIpO1xuICB9IGVsc2Uge1xuICAgIG9wdHMucHVzaChcInVzZS1hbmdsZT12dWxrYW5cIiwgXCJlbmFibGUtZmVhdHVyZXM9VnVsa2FuXCIsIFwiZGlzYWJsZS12dWxrYW4tc3VyZmFjZVwiKTtcbiAgfVxuICByZXR1cm4gb3B0cztcbn1cblxuY29uc3QgVEFHID0gXCJbRWxlY3Ryb25dXCI7XG5cbmNvbnN0IGFwcFNlYXJjaFBhdGhzID0gW1xuICBqb2luKGJhc2VkaXIsIFwiYXBwLmNqc1wiKSwgLy8gcHJvY2VzcyBmcm9tIGRpc3RcbiAgam9pbihiYXNlZGlyLCBcIi4uLy4uL2Rpc3QvYXBwLmNqc1wiKSwgLy8gcHJvY2VzcyBmcm9tIHNyY1xuXTtcbmV4cG9ydCBjb25zdCBhcHAgPSBhcHBTZWFyY2hQYXRocy5maW5kKGV4aXN0c1N5bmMpO1xub2soYXBwLCBcIkNhbm5vdCBsb2FkIGVsZWN0cm9uIGFwcFwiKTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJ1bkVsZWN0cm9uQXBwKHNpemU6IFNpemUsIGFyZ3M6IHVua25vd25bXSkge1xuICBjb25zdCBjbWRQYXJ0czogdW5rbm93bltdID0gW107XG4gIGNvbnN0IHBsYXQgPSBwbGF0Zm9ybSgpO1xuICBpZiAocGxhdCA9PT0gXCJsaW51eFwiKSB7XG4gICAgY21kUGFydHMucHVzaChgeHZmYi1ydW5gLCBgLS1hdXRvLXNlcnZlcm51bWAsIGAtLXNlcnZlci1hcmdzPVwiLXNjcmVlbiAwICR7c2l6ZS53aWR0aH14JHtzaXplLmhlaWdodH14MjRcImApO1xuICB9XG4gIGNvbnN0IG9wdHMgPSBhd2FpdCBlbGVjdHJvbk9wdHMoKTtcbiAgY29uc3QgZWxlY3Ryb25BcmdzID0gb3B0cy5tYXAoKGEpID0+IGAtLSR7YX1gKTtcbiAgY29uc3QgYmFzZTY0QXJncyA9IEJ1ZmZlci5mcm9tKEpTT04uc3RyaW5naWZ5KGFyZ3MpKS50b1N0cmluZyhcImJhc2U2NFwiKTtcbiAgZWxlY3Ryb25BcmdzLnB1c2goYCR7UFVQX0FSR1NfS0VZfT0ke2Jhc2U2NEFyZ3N9YCk7XG4gIGNtZFBhcnRzLnB1c2goZWxlY3Ryb24sIC4uLmVsZWN0cm9uQXJncywgYXBwKTtcbiAgY29uc3QgY21kID0gY21kUGFydHMuam9pbihcIiBcIik7XG4gIGxvZ2dlci5kZWJ1ZyhUQUcsIGNtZCk7XG4gIHJldHVybiBleGVjKGNtZCwge1xuICAgIHN0ZGlvOiBbXCJpZ25vcmVcIiwgXCJwaXBlXCIsIFwicGlwZVwiXSxcbiAgICBzaGVsbDogcGxhdCA9PT0gXCJsaW51eFwiLFxuICAgIGVudjogeyAuLi5wcm9jZXNzLmVudiwgUlVTVF9CQUNLVFJBQ0U6IFwiZnVsbFwiIH0sXG4gIH0pO1xufVxuIiwiLy8gQ3JlYXRlZCBieSBBdXRva2FrYSAocXExOTA5Njk4NDk0QGdtYWlsLmNvbSkgb24gMjAyNi8wMi8wOS5cblxuaW1wb3J0IHsgcmVhZEZpbGUgfSBmcm9tIFwiZnMvcHJvbWlzZXNcIjtcbmltcG9ydCB7IGpvaW4gfSBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHsgQWJvcnRMaW5rLCB0eXBlIEFib3J0UXVlcnkgfSBmcm9tIFwiLi9iYXNlL2Fib3J0XCI7XG5pbXBvcnQgeyBDb25jdXJyZW5jeUxpbWl0ZXIgfSBmcm9tIFwiLi9iYXNlL2xpbWl0ZXJcIjtcbmltcG9ydCB7IGxvZ2dlciB9IGZyb20gXCIuL2Jhc2UvbG9nZ2luZ1wiO1xuaW1wb3J0IHsgcGFyc2VOdW1iZXIgfSBmcm9tIFwiLi9iYXNlL3BhcnNlclwiO1xuaW1wb3J0IHsgcnVuRWxlY3Ryb25BcHAgfSBmcm9tIFwiLi9yZW5kZXJlci9lbGVjdHJvblwiO1xuaW1wb3J0IHsgREVGQVVMVF9IRUlHSFQsIERFRkFVTFRfV0lEVEgsIHR5cGUgUmVuZGVyT3B0aW9ucywgdHlwZSBSZW5kZXJSZXN1bHQgfSBmcm9tIFwiLi9yZW5kZXJlci9zY2hlbWFcIjtcblxuY29uc3QgVEFHID0gXCJbcHVwXVwiO1xuY29uc3QgUFJPR1JFU1NfVEFHID0gXCIgcHJvZ3Jlc3M6IFwiO1xuXG5leHBvcnQgdHlwZSBQdXBQcm9ncmVzc0NhbGxiYWNrID0gKHByb2dyZXNzOiBudW1iZXIpID0+IFByb21pc2U8dm9pZD4gfCB2b2lkO1xuXG5leHBvcnQgaW50ZXJmYWNlIFB1cE9wdGlvbnMgZXh0ZW5kcyBQYXJ0aWFsPFJlbmRlck9wdGlvbnM+IHtcbiAgY2FuY2VsUXVlcnk/OiBBYm9ydFF1ZXJ5O1xuICBvblByb2dyZXNzPzogUHVwUHJvZ3Jlc3NDYWxsYmFjaztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQdXBSZXN1bHQgZXh0ZW5kcyBSZW5kZXJSZXN1bHQge31cblxuYXN5bmMgZnVuY3Rpb24gcnVuUHVwQXBwKHNvdXJjZTogc3RyaW5nLCBvcHRpb25zOiBQdXBPcHRpb25zKSB7XG4gIGxvZ2dlci5kZWJ1ZyhUQUcsIGBydW5QdXBBcHBgLCBzb3VyY2UsIG9wdGlvbnMpO1xuXG4gIGNvbnN0IGFyZ3M6IHN0cmluZ1tdID0gW3NvdXJjZV07XG4gIGlmIChvcHRpb25zLndpZHRoKSBhcmdzLnB1c2goXCItLXdpZHRoXCIsIGAke29wdGlvbnMud2lkdGh9YCk7XG4gIGlmIChvcHRpb25zLmhlaWdodCkgYXJncy5wdXNoKFwiLS1oZWlnaHRcIiwgYCR7b3B0aW9ucy5oZWlnaHR9YCk7XG4gIGlmIChvcHRpb25zLmZwcykgYXJncy5wdXNoKFwiLS1mcHNcIiwgYCR7b3B0aW9ucy5mcHN9YCk7XG4gIGlmIChvcHRpb25zLmR1cmF0aW9uKSBhcmdzLnB1c2goXCItLWR1cmF0aW9uXCIsIGAke29wdGlvbnMuZHVyYXRpb259YCk7XG4gIGlmIChvcHRpb25zLm91dERpcikgYXJncy5wdXNoKFwiLS1vdXQtZGlyXCIsIG9wdGlvbnMub3V0RGlyKTtcbiAgaWYgKG9wdGlvbnMuZm9ybWF0cz8ubGVuZ3RoKSBhcmdzLnB1c2goXCItLWZvcm1hdHNcIiwgb3B0aW9ucy5mb3JtYXRzLmpvaW4oXCIsXCIpKTtcbiAgaWYgKG9wdGlvbnMud2l0aEF1ZGlvKSBhcmdzLnB1c2goXCItLXdpdGgtYXVkaW9cIik7XG4gIGlmIChvcHRpb25zLnVzZUlubmVyUHJveHkpIGFyZ3MucHVzaChcIi0tdXNlLWlubmVyLXByb3h5XCIpO1xuICBpZiAob3B0aW9ucy5kZXRlcm1pbmlzdGljKSBhcmdzLnB1c2goXCItLWRldGVybWluaXN0aWNcIik7XG5cbiAgY29uc3QgdyA9IG9wdGlvbnMud2lkdGggPz8gREVGQVVMVF9XSURUSDtcbiAgY29uc3QgaCA9IG9wdGlvbnMuaGVpZ2h0ID8/IERFRkFVTFRfSEVJR0hUO1xuICBjb25zdCBoYW5kbGUgPSBhd2FpdCBydW5FbGVjdHJvbkFwcCh7IHdpZHRoOiB3LCBoZWlnaHQ6IGggfSwgYXJncyk7XG4gIGNvbnN0IGNvdW50ZXIgPSBuZXcgQ29uY3VycmVuY3lMaW1pdGVyKDEpO1xuICBoYW5kbGUucHJvY2Vzcy5zdGRvdXQ/Lm9uKFwiZGF0YVwiLCAoZGF0YTogQnVmZmVyKSA9PiB7XG4gICAgbGV0IG1lc3NhZ2UgPSBkYXRhLnRvU3RyaW5nKCkudHJpbSgpO1xuICAgIGxldCBzdGFydCA9IG1lc3NhZ2UuaW5kZXhPZihQUk9HUkVTU19UQUcpO1xuICAgIGlmIChzdGFydCA8IDApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbWVzc2FnZSA9IG1lc3NhZ2Uuc2xpY2Uoc3RhcnQgKyBQUk9HUkVTU19UQUcubGVuZ3RoKTtcbiAgICBjb25zdCBlbmQgPSBtZXNzYWdlLmluZGV4T2YoXCIlXCIpO1xuICAgIGlmIChlbmQgPCAwKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHByb2dyZXNzU3RyID0gbWVzc2FnZS5zbGljZSgwLCBlbmQpO1xuICAgIGNvbnN0IHByb2dyZXNzID0gcGFyc2VOdW1iZXIocHJvZ3Jlc3NTdHIpO1xuICAgIGNvdW50ZXIuc2NoZWR1bGUoYXN5bmMgKCkgPT4ge1xuICAgICAgYXdhaXQgb3B0aW9ucy5vblByb2dyZXNzPy4ocHJvZ3Jlc3MpO1xuICAgIH0pO1xuICB9KTtcbiAgcmV0dXJuIHsgaGFuZGxlLCBjb3VudGVyIH07XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwdXAoc291cmNlOiBzdHJpbmcsIG9wdGlvbnM6IFB1cE9wdGlvbnMpOiBQcm9taXNlPFB1cFJlc3VsdD4ge1xuICBsb2dnZXIuZGVidWcoVEFHLCBgcHVwYCwgc291cmNlLCBvcHRpb25zKTtcblxuICBjb25zdCBsaW5rID0gQWJvcnRMaW5rLnN0YXJ0KG9wdGlvbnMuY2FuY2VsUXVlcnkpO1xuICBjb25zdCBvdXREaXIgPSBvcHRpb25zLm91dERpciA/PyBcIm91dFwiO1xuXG4gIGNvbnN0IHQwID0gcGVyZm9ybWFuY2Uubm93KCk7XG4gIGNvbnN0IHsgaGFuZGxlLCBjb3VudGVyIH0gPSBhd2FpdCBydW5QdXBBcHAoc291cmNlLCB7IC4uLm9wdGlvbnMsIG91dERpciB9KTtcblxuICBhd2FpdCBsaW5rLndhaXQoaGFuZGxlKTtcbiAgYXdhaXQgY291bnRlci5lbmQoKTtcbiAgbGluay5zdG9wKCk7XG4gIGxvZ2dlci5pbmZvKFRBRywgYGRvbmUgaW4gJHtNYXRoLnJvdW5kKHBlcmZvcm1hbmNlLm5vdygpIC0gdDApfW1zYCk7XG5cbiAgY29uc3Qgc3VtUGF0aCA9IGpvaW4ob3V0RGlyLCBcInN1bW1hcnkuanNvblwiKTtcbiAgcmV0dXJuIEpTT04ucGFyc2UoYXdhaXQgcmVhZEZpbGUoc3VtUGF0aCwgXCJ1dGYtOFwiKSkgYXMgUmVuZGVyUmVzdWx0O1xufVxuIl19