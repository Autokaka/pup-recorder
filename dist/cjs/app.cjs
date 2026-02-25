"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod2, isNodeMode, target) => (target = mod2 != null ? __create(__getProtoOf(mod2)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod2 || !mod2.__esModule ? __defProp(target, "default", { value: mod2, enumerable: true }) : target,
  mod2
));

// src/app.ts
var import_electron4 = require("electron");

// src/base/electron.ts
var import_electron = __toESM(require("electron"), 1);

// src/base/constants.ts
var import_fs = require("fs");
var import_path = require("path");

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
  (0, import_path.resolve)(__dirname, "cjs/app.cjs"),
  // process from dist
  (0, import_path.resolve)(__dirname, "app.cjs"),
  // process from dist/cjs
  (0, import_path.resolve)(__dirname, "../../cjs/app.cjs")
  // process from src
];
var pupAppPath = pupAppSearchPaths.find(import_fs.existsSync);
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
    return new Promise((resolve2, reject) => {
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
          resolve2();
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

// src/base/process.ts
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

// src/base/electron.ts
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

// src/base/record.ts
var import_electron3 = require("electron");
var import_promises2 = require("fs/promises");
var import_path3 = require("path");

// src/rust/lib.ts
var import_fs2 = require("fs");
var import_path2 = require("path");
var { platform, arch } = process;
var rustPath = `rust/${platform}-${arch}.node`;
var nativeSearchPaths = [
  (0, import_path2.join)(__dirname, `../../${rustPath}`),
  // process start from src
  (0, import_path2.join)(__dirname, `../${rustPath}`)
  // process start from dist
];
var mod = require(nativeSearchPaths.find(import_fs2.existsSync));
var FixedBufferWriter = mod.FixedBufferWriter;

// src/base/frame_sync.ts
var FRAME_SYNC_MARKER_WIDTH = 32;
function buildWrapperHTML(targetURL, size) {
  const { width, height } = size;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: ${width}px; height: ${height + 1}px; overflow: hidden; }
    #target { 
      position: absolute; 
      top: 0; 
      left: 0; 
      width: ${width}px; 
      height: ${height}px; 
      border: none; 
      display: block;
    }
    #stego { 
      position: absolute; 
      top: ${height}px; 
      left: 0; 
      width: ${width}px; 
      height: 1px; 
      display: block;
      image-rendering: pixelated;
    }
  </style>
</head>
<body>
  <iframe id="target" src="${targetURL}"></iframe>
  <canvas id="stego" width="${width}" height="1"></canvas>
  <script>
    (function() {
      const WIDTH = ${width};
      const MARKER_WIDTH = ${FRAME_SYNC_MARKER_WIDTH};
      const canvas = document.getElementById('stego');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      let startTime = null;
      let rafId = null;

      function encodeTimestamp(timestampMs) {
        const imageData = ctx.createImageData(WIDTH, 1);
        const data = imageData.data;
        
        const timestampInt = Math.floor(timestampMs) >>> 0;
        
        for (let i = 0; i < MARKER_WIDTH; i++) {
          const bit = (timestampInt >>> (MARKER_WIDTH - 1 - i)) & 1;
          const value = bit ? 255 : 0;
          const idx = i * 4;
          data[idx] = value;
          data[idx + 1] = value;
          data[idx + 2] = value;
          data[idx + 3] = 255;
        }
        
        for (let i = MARKER_WIDTH; i < WIDTH; i++) {
          const idx = i * 4;
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
          data[idx + 3] = 255;
        }
        
        ctx.putImageData(imageData, 0, 0);
      }

      function updateLoop() {
        if (startTime === null) return;
        const elapsed = performance.now() - startTime;
        encodeTimestamp(elapsed);
        rafId = requestAnimationFrame(updateLoop);
      }

      window.__pup_start_recording__ = () => {
        startTime = performance.now();
        encodeTimestamp(0);
        requestAnimationFrame(updateLoop);
      };

      window.__pup_stop_recording__ = () => {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      };
    })();
  </script>
</body>
</html>`;
}
function decodeTimestamp(bitmap, size) {
  const { width, height } = size;
  if (width < FRAME_SYNC_MARKER_WIDTH || height < 2) {
    return void 0;
  }
  const markerRow = height - 1;
  let timestamp = 0;
  for (let i = 0; i < FRAME_SYNC_MARKER_WIDTH; i++) {
    const pixelIdx = (markerRow * width + i) * 4;
    const r = bitmap[pixelIdx] ?? 0;
    const bit = r > 127 ? 1 : 0;
    timestamp = timestamp << 1 | bit;
  }
  timestamp = timestamp >>> 0;
  if (!Number.isFinite(timestamp) || timestamp < 0 || timestamp > 1e7) {
    return void 0;
  }
  return timestamp;
}
function startSync(cdp) {
  return cdp.sendCommand("Runtime.evaluate", {
    expression: `window.__pup_start_recording__()`
  });
}
function stopSync(cdp) {
  return cdp.sendCommand("Runtime.evaluate", {
    expression: `window.__pup_stop_recording__()`
  });
}

// src/base/html_check.ts
var SUPPORTED_PROTOCOLS = ["file:", "http:", "https:", "data:"];
var SOURCE_PATTERN = /^(file:|https?:|data:)/;
function checkHTML(source) {
  if (SOURCE_PATTERN.test(source)) {
    return;
  }
  const protocol = source.split(":")[0] + ":";
  const message = SUPPORTED_PROTOCOLS.includes(protocol) ? `unsupported protocol: ${protocol}, expected ${SUPPORTED_PROTOCOLS.join(", ")}` : `invalid source format, expected ${SUPPORTED_PROTOCOLS.join(", ")}`;
  throw new Error(message);
}

// src/base/image.ts
function isEmpty(image) {
  const size = image.getSize();
  if (size.width === 0 || size.height === 0) return true;
  return image.isEmpty();
}

// src/base/proxy.ts
var import_electron2 = require("electron");
var TAG = "[Proxy]";
function proxiedUrl(url) {
  if (!url.startsWith("http")) {
    return url;
  }
  const match = url.match(/^https:\/\/([^-]+)-boss\.hdslb\.com(.*)$/);
  if (match) {
    const [, prefix, path] = match;
    return `http://${prefix}-boss.bilibili.co${path}`;
  }
  return url;
}
function enableProxy() {
  import_electron2.session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const url = details.url;
    const proxied = proxiedUrl(url);
    if (proxied === url) {
      return callback({ cancel: false });
    } else {
      logger.debug(TAG, `${url} -> ${proxied}`);
      callback({ cancel: false, redirectURL: proxied });
    }
  });
}

// src/base/retry.ts
var import_promises = require("timers/promises");

// src/base/timing.ts
function sleep(ms) {
  return new Promise((resolve2) => setTimeout(resolve2, ms));
}

// src/base/retry.ts
function useRetry({
  fn,
  maxAttempts = 3,
  timeout
}) {
  const timeoutError = new Error(`timeout over ${timeout}ms`);
  return async function(...args) {
    let attempt = 0;
    while (true) {
      try {
        const promises = [fn(...args)];
        if (timeout) {
          promises.push(
            (0, import_promises.setTimeout)(timeout).then(() => {
              throw timeoutError;
            })
          );
        }
        return await Promise.race(promises);
      } catch (e) {
        attempt++;
        if (attempt >= maxAttempts) {
          throw e;
        }
        await sleep(Math.pow(2, attempt) * 100 + Math.random() * 100);
      }
    }
  };
}

// src/base/record.ts
var TAG2 = "[Record]";
async function loadWindow(source, options) {
  checkHTML(source);
  const { width, height, useInnerProxy } = options;
  import_electron3.session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    delete responseHeaders["x-frame-options"];
    delete responseHeaders["X-Frame-Options"];
    delete responseHeaders["content-security-policy"];
    delete responseHeaders["Content-Security-Policy"];
    callback({ cancel: false, responseHeaders });
  });
  let src = source;
  if (useInnerProxy) {
    src = proxiedUrl(source);
    enableProxy();
  }
  const win = new import_electron3.BrowserWindow({
    width,
    height: height + 1,
    show: false,
    transparent: true,
    backgroundColor: void 0,
    webPreferences: {
      offscreen: true,
      backgroundThrottling: false,
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
      experimentalFeatures: true
    }
  });
  win.webContents.on("console-message", (event) => {
    if (event.level === "error") {
      logger.error(TAG2, "console:", event.message);
    }
  });
  const wrapperHTML = buildWrapperHTML(src, { width, height });
  const dataURL = `data:text/html;charset=utf-8,${encodeURIComponent(wrapperHTML)}`;
  let token;
  await new Promise((resolve2, reject) => {
    token = setTimeout(() => {
      reject(new Error("load window timeout"));
    }, 20 * 1e3);
    win.webContents.once("did-finish-load", resolve2);
    win.webContents.once("did-fail-load", (_event, code, desc, url) => {
      reject(new Error(`failed to load ${url}: [${code}] ${desc}`));
    });
    win.webContents.once("render-process-gone", (_event, details) => {
      const { exitCode, reason } = details;
      reject(new Error(`renderer crashed: ${exitCode}, ${reason}`));
    });
    win.loadURL(dataURL);
  });
  clearTimeout(token);
  return win;
}
async function record(source, options) {
  logger.info(TAG2, `progress: 0%`);
  const { outDir, fps, width, height, duration } = options;
  const win = await useRetry({ fn: loadWindow, maxAttempts: 2 })(
    source,
    options
  );
  await (0, import_promises2.mkdir)(outDir, { recursive: true });
  const cdp = win.webContents.debugger;
  cdp.attach("1.3");
  win.webContents.setFrameRate(fps);
  if (!win.webContents.isPainting()) {
    win.webContents.startPainting();
  }
  const bgraPath = (0, import_path3.join)(outDir, "output.bgra");
  const total = Math.ceil(fps * duration);
  const frameInterval = 1e3 / fps;
  const bufferSize = width * height * 4;
  const writer = new FixedBufferWriter(bgraPath, bufferSize, fps);
  let written = 0;
  let lastWrittenTime;
  let progress = 0;
  let frameError;
  let resolver;
  let rejecter;
  const scheduleWrite = (buffer) => {
    written++;
    try {
      writer.write(buffer);
    } catch (error) {
      frameError ??= error;
    }
  };
  const paint = (_e, _r, image) => {
    if (frameError) {
      rejecter?.(frameError);
      return;
    }
    if (written >= total) {
      resolver?.();
      return;
    }
    if (isEmpty(image)) return;
    const bitmap = image.toBitmap();
    const currentTime = decodeTimestamp(bitmap, image.getSize());
    if (currentTime === void 0) {
      frameError ??= new Error(`no timestamp @ ${written}`);
      return;
    }
    const bytesPerRow = width * 4;
    const cropped = bitmap.subarray(0, height * bytesPerRow);
    if (lastWrittenTime === void 0) {
      scheduleWrite(cropped);
      lastWrittenTime = currentTime;
      return;
    }
    const timeSinceLastFrame = currentTime - lastWrittenTime;
    if (timeSinceLastFrame < frameInterval * 0.8) {
      return;
    }
    if (timeSinceLastFrame <= frameInterval * 1.2) {
      scheduleWrite(cropped);
    } else {
      const framesToInsert = Math.round(timeSinceLastFrame / frameInterval);
      for (let i = 0; i < framesToInsert && written < total; i++) {
        scheduleWrite(cropped);
      }
    }
    lastWrittenTime = currentTime;
    const newProgress = Math.floor(written / total * 100);
    if (Math.abs(newProgress - progress) > 10) {
      progress = newProgress;
      logger.info(TAG2, `progress: ${Math.round(progress)}%`);
    }
  };
  win.webContents.on("paint", paint);
  await startSync(cdp);
  try {
    await new Promise((r, j) => [resolver, rejecter] = [r, j]);
  } finally {
    await stopSync(cdp);
    win.webContents.off("paint", paint);
    await writer.close();
  }
  if (frameError || written === 0) {
    throw frameError ?? new Error("no frames captured");
  }
  try {
    const result = { options, written, bgraPath };
    await (0, import_promises2.writeFile)((0, import_path3.join)(outDir, "record.json"), JSON.stringify(result));
    logger.info(TAG2, `progress: 100%, ${written} frames written`);
  } finally {
    win.close();
  }
}

// src/common.ts
var import_commander = require("commander");

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

// src/common.ts
var DEFAULT_WIDTH = 1920;
var DEFAULT_HEIGHT = 1080;
var DEFAULT_FPS = 30;
var DEFAULT_DURATION = 5;
var DEFAULT_OUT_DIR = "out";
function makeCLI(name, callback) {
  import_commander.program.name(name).argument("<source>", "file://, http(s)://, \u6216 data: URI").option("-w, --width <number>", "\u89C6\u9891\u5BBD\u5EA6", `${DEFAULT_WIDTH}`).option("-h, --height <number>", "\u89C6\u9891\u9AD8\u5EA6", `${DEFAULT_HEIGHT}`).option("-f, --fps <number>", "\u5E27\u7387", `${DEFAULT_FPS}`).option("-t, --duration <number>", "\u5F55\u5236\u65F6\u957F\uFF08\u79D2\uFF09", `${DEFAULT_DURATION}`).option("-o, --out-dir <path>", "\u8F93\u51FA\u76EE\u5F55", `${DEFAULT_OUT_DIR}`).option("-a, --with-alpha-channel", "\u8F93\u51FA\u5305\u542B alpha \u901A\u9053\u7684\u89C6\u9891", false).option(
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
  import_commander.program.parse(pargs());
}

// src/app.ts
process.once("exit", () => import_electron4.app.quit());
makeCLI("app", async (source, options) => {
  try {
    ELECTRON_OPTS.forEach((o) => import_electron4.app.commandLine.appendSwitch(o));
    import_electron4.app.dock?.hide();
    await import_electron4.app.whenReady();
    await record(source, options);
  } finally {
    import_electron4.app.quit();
  }
});
//# sourceMappingURL=app.cjs.map
