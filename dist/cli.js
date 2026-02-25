// src/common.ts
import { program } from "commander";

// src/base/constants.ts
import { existsSync } from "fs";
import { resolve } from "path";

// src/base/env.ts
function penv(name, parser, defaultValue) {
  try {
    return parser(process.env[name]);
  } catch {
    return defaultValue;
  }
}

// src/base/parser.ts
function parseNumber(value) {
  if (typeof value === "number") {
    return value;
  }
  const num = Number(value);
  if (Number.isNaN(num)) {
    throw new Error(`Value ${value} is not a valid number`);
  }
  return num;
}

// src/base/constants.ts
var pupAppSearchPaths = [
  resolve(__dirname, "cjs/app.cjs"),
  // process from dist
  resolve(__dirname, "app.cjs"),
  // process from dist/cjs
  resolve(__dirname, "../../cjs/app.cjs")
  // process from src
];
var pupAppPath = pupAppSearchPaths.find(existsSync);
var env = process.env;
var pupLogLevel = penv("PUP_LOG_LEVEL", parseNumber, 2);
var pupUseInnerProxy = env["PUP_USE_INNER_PROXY"] === "1";
var pupFFmpegPath = env["FFMPEG_BIN"] ?? `ffmpeg`;

// src/base/logging.ts
var DEBUG = "<pup@debug>";
var INFO = "<pup@info>";
var WARN = "<pup@warn>";
var ERROR = "<pup@error>";
var FATAL = "<pup@fatal>";
var Logger = class {
  _impl;
  get impl() {
    return this._impl;
  }
  set impl(value) {
    const debug = value.debug ?? console.debug;
    const info = value.info ?? console.info;
    const warn = value.warn ?? console.warn;
    const error = value.error ?? console.error;
    this._impl = {
      debug: pupLogLevel >= 3 ? debug : void 0,
      info: pupLogLevel >= 2 ? info : void 0,
      warn: pupLogLevel >= 1 ? warn : void 0,
      error: pupLogLevel >= 0 ? error : void 0
    };
  }
  constructor() {
    this.impl = console;
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
    return new Promise((resolve3, reject) => {
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
          this.error(`${name}.close`, { code, signal, fatal });
          reject(new Error(fatal));
        } else {
          this.debug(`${name}.close`);
          resolve3();
        }
      }).on("unhandledRejection", (reason) => {
        this.error(`${name}.unhandled`, reason);
      }).on("uncaughtExceptionMonitor", (err) => {
        this.error(`${name}.unhandled`, err);
      });
    });
  }
};
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

// src/base/process.ts
import { spawn } from "child_process";
var PUP_ARGS_ENV_KEY = "__PUP_ARGS__";
function pargs() {
  const pupArgs = process.env[PUP_ARGS_ENV_KEY];
  if (pupArgs) {
    const args = ["exec", ...process.argv.slice(-1)];
    args.push(...JSON.parse(pupArgs));
    logger.debug("pupargs", args);
    return args;
  }
  logger.debug("procargv", process.argv);
  return process.argv;
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

// src/common.ts
var DEFAULT_WIDTH = 1920;
var DEFAULT_HEIGHT = 1080;
var DEFAULT_FPS = 30;
var DEFAULT_DURATION = 5;
var DEFAULT_OUT_DIR = "out";
function makeCLI(name, callback) {
  program.name(name).argument("<source>", "file://, http(s)://, \u6216 data: URI").option("-w, --width <number>", "\u89C6\u9891\u5BBD\u5EA6", `${DEFAULT_WIDTH}`).option("-h, --height <number>", "\u89C6\u9891\u9AD8\u5EA6", `${DEFAULT_HEIGHT}`).option("-f, --fps <number>", "\u5E27\u7387", `${DEFAULT_FPS}`).option("-t, --duration <number>", "\u5F55\u5236\u65F6\u957F\uFF08\u79D2\uFF09", `${DEFAULT_DURATION}`).option("-o, --out-dir <path>", "\u8F93\u51FA\u76EE\u5F55", `${DEFAULT_OUT_DIR}`).option("-a, --with-alpha-channel", "\u8F93\u51FA\u5305\u542B alpha \u901A\u9053\u7684\u89C6\u9891", false).option(
    "--use-inner-proxy",
    "\u4F7F\u7528 B \u7AD9\u5185\u7F51\u4EE3\u7406\u52A0\u901F\u8D44\u6E90\u8BBF\u95EE",
    pupUseInnerProxy
  ).action(async (source, opts) => {
    try {
      await callback(source, {
        width: noerr(parseNumber, DEFAULT_WIDTH)(opts.width),
        height: noerr(parseNumber, DEFAULT_HEIGHT)(opts.height),
        fps: noerr(parseNumber, DEFAULT_FPS)(opts.fps),
        duration: noerr(parseNumber, DEFAULT_DURATION)(opts.duration),
        outDir: opts.outDir ?? DEFAULT_OUT_DIR,
        withAlphaChannel: opts.withAlphaChannel ?? false,
        useInnerProxy: opts.useInnerProxy ?? pupUseInnerProxy
      });
    } catch (e) {
      logger.fatal(e);
    }
  });
  program.parse(pargs());
}

// src/pup.ts
import { spawn as spawn2 } from "child_process";
import { readFile, rm } from "fs/promises";
import { join } from "path";

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

// src/base/electron.ts
import electron from "electron";
var ELECTRON_OPTS = [
  "no-sandbox",
  "disable-setuid-sandbox",
  "disable-gpu",
  "disable-dev-shm-usage",
  "disable-software-rasterizer",
  "disable-web-security",
  "disable-site-isolation-trials",
  "disable-features=IsolateOrigins,site-per-process",
  "allow-insecure-localhost",
  "ignore-certificate-errors",
  "disable-blink-features=AutomationControlled",
  "mute-audio",
  "disable-extensions",
  "disable-background-networking",
  "address-family=ipv4",
  "disable-async-dns",
  "force-device-scale-factor=1",
  "trace-warnings",
  "force-color-profile=srgb",
  "disable-color-correct-rendering",
  "log-level=3"
];
function runElectronApp(size, app, args) {
  const electronArgs = ELECTRON_OPTS.map((a) => `--${a}`);
  const cmdParts = [];
  if (process.platform === "linux") {
    cmdParts.push(
      "xvfb-run",
      "--auto-servernum",
      `--server-args='-screen 0 ${size.width}x${size.height}x24'`
    );
  }
  cmdParts.push(electron, ...electronArgs, app);
  return exec(cmdParts.join(" "), {
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
    env: {
      ...process.env,
      ELECTRON_DISABLE_DBUS: "1",
      RUST_BACKTRACE: "full",
      __PUP_ARGS__: JSON.stringify(args)
    }
  });
}

// src/base/ffmpeg.ts
import { existsSync as existsSync2 } from "fs";
import { resolve as resolve2 } from "path";
import { arch, platform } from "process";
var quiet = ["-hide_banner", "-loglevel", "error", "-nostats"];
function resolveX265() {
  const path = `x265/${platform}-${arch}`;
  const dirs = [
    resolve2(__dirname, `../../${path}`),
    // process from src
    resolve2(__dirname, `../${path}`)
    // process from dist
  ];
  const found = dirs.find(existsSync2);
  if (!found) {
    throw new Error("x265 not found");
  }
  return found;
}
function createBgraFileCommand(bgraPath, spec, files) {
  const { fps, frames } = spec;
  const args = [
    "-y",
    ...quiet,
    "-f",
    "rawvideo",
    "-pix_fmt",
    "bgra",
    "-s",
    `${spec.size.width}x${spec.size.height}`,
    "-r",
    `${fps}`,
    "-i",
    bgraPath,
    "-frames:v",
    `${Math.floor(frames)}`
  ];
  if (files.mp4) {
    args.push(
      "-colorspace",
      "bt709",
      "-color_primaries",
      "bt709",
      "-color_trc",
      "bt709",
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-threads",
      "0",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      files.mp4
    );
  }
  if (files.webm) {
    args.push(
      "-c:v",
      "libvpx-vp9",
      "-row-mt",
      "1",
      "-cpu-used",
      "1",
      "-threads",
      "0",
      "-pix_fmt",
      "yuva420p",
      "-auto-alt-ref",
      "0",
      files.webm
    );
  }
  return { command: pupFFmpegPath, args };
}
function createBgraToMovPipeline(bgraPath, spec, mov) {
  const { fps, size } = spec;
  return {
    raw: {
      command: pupFFmpegPath,
      args: [
        "-y",
        ...quiet,
        "-f",
        "rawvideo",
        "-pix_fmt",
        "bgra",
        "-s",
        `${size.width}x${size.height}`,
        "-r",
        `${fps}`,
        "-i",
        bgraPath,
        "-f",
        "rawvideo",
        "-pix_fmt",
        "yuva420p10le",
        "pipe:1"
      ]
    },
    x265: {
      command: resolveX265(),
      args: [
        "--no-progress",
        "--log-level",
        "error",
        "--input",
        "-",
        "--input-res",
        `${size.width}x${size.height}`,
        "--input-csp",
        "i420",
        "--input-depth",
        "10",
        "--output-depth",
        "10",
        "--fps",
        `${fps}`,
        "--alpha",
        "--bframes",
        "0",
        "--colorprim",
        "bt709",
        "--transfer",
        "bt709",
        "--colormatrix",
        "bt709",
        "--crf",
        "18",
        "--output",
        "-"
      ]
    },
    mux: {
      command: pupFFmpegPath,
      args: [
        "-y",
        ...quiet,
        "-f",
        "hevc",
        "-r",
        `${fps}`,
        "-i",
        "pipe:0",
        "-c:v",
        "copy",
        "-tag:v",
        "hvc1",
        "-movflags",
        "+faststart",
        mov
      ]
    }
  };
}
function createCoverCommand(src, dst) {
  return {
    command: pupFFmpegPath,
    args: ["-y", ...quiet, "-i", src, "-frames:v", "1", "-q:v", "2", dst]
  };
}

// src/base/encoder.ts
function encodeBgraFile(bgraPath, outputPath, spec, format) {
  const files = format === "mp4" ? { mp4: outputPath } : { webm: outputPath };
  const cmd = createBgraFileCommand(bgraPath, spec, files);
  return exec(`${cmd.command} ${cmd.args.join(" ")}`, {
    stdio: ["ignore", "inherit", "inherit"]
  });
}
function encodeBgraToMov(bgraPath, movPath, spec) {
  const x265 = createBgraToMovPipeline(bgraPath, spec, movPath);
  const shellCmd = [
    `${x265.raw.command} ${x265.raw.args.join(" ")}`,
    `${x265.x265.command} ${x265.x265.args.join(" ")}`,
    `${x265.mux.command} ${x265.mux.args.join(" ")}`
  ].join(" | ");
  return exec(shellCmd, {
    stdio: ["ignore", "inherit", "inherit"],
    shell: true
  });
}

// src/base/limiter.ts
var ConcurrencyLimiter = class {
  constructor(maxConcurrency) {
    this.maxConcurrency = maxConcurrency;
  }
  _active = 0;
  _queue = [];
  _pending = 0;
  _ended = false;
  get active() {
    return this._active;
  }
  get pending() {
    return this._pending;
  }
  async schedule(fn) {
    if (this._ended) {
      throw new Error("ended");
    }
    return new Promise((resolve3, reject) => {
      const run = () => {
        this._active++;
        this._pending--;
        fn().then(resolve3).catch(reject).finally(() => {
          this._active--;
          this.next();
        });
      };
      this._pending++;
      if (this._active < this.maxConcurrency) {
        run();
      } else {
        this._queue.push(run);
      }
    });
  }
  async end() {
    if (!this._ended) {
      this._ended = true;
      while (this._active > 0 || this._pending > 0) {
        await new Promise((resolve3) => setTimeout(resolve3, 50));
      }
    }
  }
  next() {
    if (this._active < this.maxConcurrency && this._queue.length > 0) {
      this._queue.shift()?.();
    }
  }
};

// src/base/stream.ts
function waitAll(...procs) {
  return Promise.all(
    procs.map(
      (proc) => new Promise((resolve3, reject) => {
        proc.on("error", reject);
        proc.on(
          "close",
          (code) => code === 0 ? resolve3() : reject(new Error(`exit ${code ?? "null"}`))
        );
      })
    )
  );
}

// src/pup.ts
var TAG = "[pup]";
var PROGRESS_TAG = " progress: ";
function runPupApp(source, options) {
  logger.debug(TAG, `runPupApp`, source, options);
  const args = [source];
  if (options.width) args.push("--width", `${options.width}`);
  if (options.height) args.push("--height", `${options.height}`);
  if (options.fps) args.push("--fps", `${options.fps}`);
  if (options.duration) args.push("--duration", `${options.duration}`);
  if (options.outDir) args.push("--out-dir", options.outDir);
  if (options.withAlphaChannel) args.push("--with-alpha-channel");
  const w = options.width ?? DEFAULT_WIDTH;
  const h = options.height ?? DEFAULT_HEIGHT;
  const handle = runElectronApp({ width: w, height: h }, pupAppPath, args);
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
  logger.debug(TAG, `pup`, source, options);
  const link = AbortLink.start(options.cancelQuery);
  const outDir = options.outDir ?? "out";
  const t0 = performance.now();
  const { handle, counter } = runPupApp(source, { ...options, outDir });
  await link.wait(handle);
  await counter.end();
  logger.info(TAG, `capture cost ${Math.round(performance.now() - t0)}ms`);
  const metaPath = join(outDir, "record.json");
  const meta = JSON.parse(await readFile(metaPath, "utf-8"));
  const { bgraPath, written, options: recordOptions } = meta;
  const { fps, width, height, withAlphaChannel } = recordOptions;
  const size = { width, height };
  const outputs = {
    mp4: withAlphaChannel ? void 0 : join(outDir, "output.mp4"),
    webm: withAlphaChannel ? join(outDir, "output.webm") : void 0,
    mov: withAlphaChannel ? join(outDir, "output.mov") : void 0,
    cover: join(outDir, "cover.png")
  };
  try {
    const t1 = performance.now();
    const spec = { fps, frames: written, size };
    const handles = [];
    if (outputs.mp4) {
      handles.push(encodeBgraFile(bgraPath, outputs.mp4, spec, "mp4"));
    }
    if (outputs.webm) {
      handles.push(encodeBgraFile(bgraPath, outputs.webm, spec, "webm"));
    }
    if (outputs.mov) {
      handles.push(encodeBgraToMov(bgraPath, outputs.mov, spec));
    }
    await link.wait(...handles);
    const coverSrc = outputs.mov ?? outputs.webm ?? outputs.mp4;
    if (coverSrc) {
      const coverCmd = createCoverCommand(coverSrc, outputs.cover);
      await waitAll(
        spawn2(coverCmd.command, coverCmd.args, { stdio: "inherit" })
      );
    }
    link.stop();
    logger.info(TAG, `encoding cost ${Math.round(performance.now() - t1)}ms`);
    await Promise.all([
      rm(bgraPath, { force: true }),
      rm(metaPath, { force: true })
    ]);
    return {
      ...outputs,
      width,
      height,
      fps,
      duration: Math.ceil(written / fps)
    };
  } catch (error) {
    await rm(outDir, { recursive: true, force: true });
    throw error;
  }
}

// src/cli.ts
makeCLI("pup", pup);
//# sourceMappingURL=cli.js.map
