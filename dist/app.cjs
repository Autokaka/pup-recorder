'use strict';

require('source-map-support/register.js');
var electron = require('electron');
var module$1 = require('module');
var path = require('path');
var commander = require('commander');
var z = require('zod');
var assert = require('assert');
var promises = require('fs/promises');
var nodeAv = require('node-av');
var constants = require('node-av/constants');
var crypto = require('crypto');
var os = require('os');
var promises$1 = require('timers/promises');
var url = require('url');

function _interopDefault (e) { return e && e.__esModule ? e : { default: e }; }

var z__default = /*#__PURE__*/_interopDefault(z);

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

// ../../node_modules/.bun/tsup@8.5.1+07a0d61bb07514ee/node_modules/tsup/assets/cjs_shims.js
var getImportMetaUrl = () => typeof document === "undefined" ? new URL(`file:${__filename}`).href : document.currentScript && document.currentScript.tagName.toUpperCase() === "SCRIPT" ? document.currentScript.src : new URL("main.js", document.baseURI).href;
var importMetaUrl = /* @__PURE__ */ getImportMetaUrl();

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
var require2 = module$1.createRequire(importMetaUrl);
var env = process.env;
var pupLogLevel = penv("PUP_LOG_LEVEL", parseNumber, 2);
var pupUseInnerProxy = env["PUP_USE_INNER_PROXY"] === "1";
env["PUP_DISABLE_GPU"] === "1";
var pupPkgRoot = path.dirname(require2.resolve("pup-recorder/package.json"));
path.join(pupPkgRoot, "dist", "app.cjs");

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

// src/base/process.ts
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
var DEFAULT_WIDTH = 1920;
var DEFAULT_HEIGHT = 1080;
var DEFAULT_FPS = 30;
var DEFAULT_DURATION = 5;
var DEFAULT_OUT_DIR = "out";
var VIDEO_FORMATS = ["mp4", "webm"];
function isVideoFormat(s) {
  return VIDEO_FORMATS.includes(s);
}
var RenderSchema = z__default.default.object({
  duration: z__default.default.number().optional().default(DEFAULT_DURATION).describe("Duration in seconds"),
  width: z__default.default.number().optional().default(DEFAULT_WIDTH).describe("Video width"),
  height: z__default.default.number().optional().default(DEFAULT_HEIGHT).describe("Video height"),
  fps: z__default.default.number().optional().default(DEFAULT_FPS).describe("Frames per second"),
  formats: z__default.default.array(z__default.default.enum(VIDEO_FORMATS)).optional().default(["mp4"]).describe(`Output video formats, allow ${VIDEO_FORMATS.join(", ")}`),
  withAudio: z__default.default.boolean().optional().default(false).describe("Capture and encode audio"),
  outDir: z__default.default.string().optional().default(DEFAULT_OUT_DIR).describe("Output directory"),
  useInnerProxy: z__default.default.boolean().optional().default(false).describe("Use bilibili inner proxy for resource access"),
  deterministic: z__default.default.boolean().optional().default(false).describe("Render by frame rather than recording")
});

// src/common.ts
async function makeCLI(name, callback) {
  const shape = RenderSchema.shape;
  commander.program.name(name).argument("<source>", "file://, http(s)://, \u6216 data: URI").option("-W, --width <number>", shape.width.description, `${DEFAULT_WIDTH}`).option("-H, --height <number>", shape.height.description, `${DEFAULT_HEIGHT}`).option("-f, --fps <number>", shape.fps.description, `${DEFAULT_FPS}`).option("-t, --duration <number>", shape.duration.description, `${DEFAULT_DURATION}`).option("-o, --out-dir <path>", shape.outDir.description, `${DEFAULT_OUT_DIR}`).option("-F, --formats <formats>", shape.formats.description, "mp4").option("-a, --with-audio", shape.withAudio.description, false).option("--use-inner-proxy", shape.useInnerProxy.description, pupUseInnerProxy).option("-d, --deterministic", shape.deterministic.description, false).action(async (source, opts) => {
    try {
      await callback(source, {
        width: noerr(parseNumber, DEFAULT_WIDTH)(opts.width),
        height: noerr(parseNumber, DEFAULT_HEIGHT)(opts.height),
        fps: noerr(parseNumber, DEFAULT_FPS)(opts.fps),
        duration: noerr(parseNumber, DEFAULT_DURATION)(opts.duration),
        outDir: opts.outDir ?? DEFAULT_OUT_DIR,
        formats: parseString(opts.formats).split(",").map((s) => s.trim()).filter(isVideoFormat),
        withAudio: opts.withAudio ?? false,
        useInnerProxy: opts.useInnerProxy ?? pupUseInnerProxy,
        deterministic: opts.deterministic ?? false
      });
    } catch (e) {
      logger.fatal(e);
    }
  });
  await commander.program.parseAsync(pargs());
}

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
var SAMPLE_FMT_NAME = {
  [constants.AV_SAMPLE_FMT_FLT]: "flt",
  [constants.AV_SAMPLE_FMT_FLTP]: "fltp"
};
var AudioEncoder = class _AudioEncoder {
  _ctx;
  _stream;
  _outRate;
  _outFmt;
  _frameSize;
  _pkt;
  _filterFrame;
  _graph;
  _bufSrc;
  _bufSink;
  _inRate;
  pts = 0n;
  constructor(ctx, stream, outFmt) {
    this._ctx = ctx;
    this._stream = stream;
    this._outRate = ctx.sampleRate;
    this._outFmt = outFmt;
    this._frameSize = ctx.frameSize;
    this._pkt = new nodeAv.Packet();
    this._pkt.alloc();
    this._filterFrame = new nodeAv.Frame();
    this._filterFrame.alloc();
  }
  static async create(opts) {
    const { outSampleRate, outSampleFmt, codecName, globalHeader, bitrate, muxer } = opts;
    const codec = nodeAv.Codec.findEncoderByName(codecName);
    if (!codec) throw new Error(`Audio encoder not found: ${codecName}`);
    const ctx = new nodeAv.CodecContext();
    ctx.allocContext3(codec);
    ctx.codecId = codec.id;
    ctx.sampleFormat = outSampleFmt;
    ctx.sampleRate = outSampleRate;
    ctx.channelLayout = constants.AV_CHANNEL_LAYOUT_STEREO;
    ctx.timeBase = new nodeAv.Rational(1, outSampleRate);
    ctx.bitRate = BigInt(bitrate);
    if (globalHeader) ctx.setFlags(constants.AV_CODEC_FLAG_GLOBAL_HEADER);
    nodeAv.FFmpegError.throwIfError(await ctx.open2(codec, null), "audioCtx.open2");
    const stream = muxer.addStream(ctx);
    return new _AudioEncoder(ctx, stream, outSampleFmt);
  }
  /** Called once when audio-meta arrives with the page's actual sample rate. */
  setInputRate(inSampleRate) {
    this._disposeGraph();
    this._inRate = inSampleRate;
    const graph = new nodeAv.FilterGraph();
    graph.alloc();
    const abuffer = nodeAv.Filter.getByName("abuffer");
    const srcArgs = `sample_rate=${inSampleRate}:sample_fmt=flt:channel_layout=stereo:time_base=1/${inSampleRate}`;
    const bufSrc = graph.createFilter(abuffer, "src", srcArgs);
    if (!bufSrc) throw new Error("Failed to create abuffer");
    const abuffersink = nodeAv.Filter.getByName("abuffersink");
    const bufSink = graph.createFilter(abuffersink, "sink");
    if (!bufSink) throw new Error("Failed to create abuffersink");
    const fmtName = SAMPLE_FMT_NAME[this._outFmt] ?? "flt";
    const filterDesc = `aformat=sample_fmts=${fmtName}:sample_rates=${this._outRate}:channel_layouts=stereo,asetnsamples=n=${this._frameSize}:p=1`;
    const outputs = nodeAv.FilterInOut.createList([{ name: "in", filterCtx: bufSrc, padIdx: 0 }]);
    const inputs = nodeAv.FilterInOut.createList([{ name: "out", filterCtx: bufSink, padIdx: 0 }]);
    nodeAv.FFmpegError.throwIfError(graph.parsePtr(filterDesc, inputs, outputs), "graph.parsePtr");
    nodeAv.FFmpegError.throwIfError(graph.configSync(), "graph.config");
    this._graph = graph;
    this._bufSrc = bufSrc;
    this._bufSink = bufSink;
  }
  get stream() {
    return this._stream;
  }
  get timeBase() {
    return this._ctx.timeBase;
  }
  async encode(pcm, muxer) {
    var _stack = [];
    try {
      if (!this._bufSrc || !this._bufSink || !this._inRate) return;
      const src = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.byteLength / 4);
      for (let i = 0; i < src.length; i++) {
        if (!isFinite(src[i])) src[i] = 0;
      }
      const nSamples = src.length >> 1;
      const frame = __using(_stack, nodeAv.Frame.fromAudioBuffer(Buffer.from(src.buffer, src.byteOffset, src.byteLength), {
        nbSamples: nSamples,
        format: constants.AV_SAMPLE_FMT_FLT,
        sampleRate: this._inRate,
        channelLayout: constants.AV_CHANNEL_LAYOUT_STEREO,
        pts: this.pts,
        timeBase: { num: 1, den: this._inRate }
      }));
      this.pts += BigInt(nSamples);
      nodeAv.FFmpegError.throwIfError(await this._bufSrc.buffersrcAddFrame(frame), "buffersrcAddFrame");
      await this._drainFilter(muxer);
    } catch (_) {
      var _error = _, _hasError = true;
    } finally {
      __callDispose(_stack, _error, _hasError);
    }
  }
  async flush(muxer) {
    if (this._bufSrc && this._bufSink) {
      await this._bufSrc.buffersrcAddFrame(null);
      await this._drainFilter(muxer);
    }
    await this._ctx.sendFrame(null);
    await this._drainCodec(muxer);
  }
  [Symbol.dispose]() {
    this._pkt.free();
    this._filterFrame.free();
    this._disposeGraph();
    this._ctx.freeContext();
  }
  /** Drain filter → send to codec → drain codec packets. */
  async _drainFilter(muxer) {
    const outFrame = this._filterFrame;
    while (true) {
      const r = await this._bufSink.buffersinkGetFrame(outFrame);
      if (r === constants.AVERROR_EAGAIN || r === constants.AVERROR_EOF) break;
      nodeAv.FFmpegError.throwIfError(r, "buffersinkGetFrame");
      nodeAv.FFmpegError.throwIfError(await this._ctx.sendFrame(outFrame), "audioCtx.sendFrame");
      outFrame.unref();
      await this._drainCodec(muxer);
    }
  }
  /** Drain codec packets to muxer. */
  async _drainCodec(muxer) {
    const pkt = this._pkt;
    while (true) {
      const r = await this._ctx.receivePacket(pkt);
      if (r === constants.AVERROR_EAGAIN || r === constants.AVERROR_EOF) break;
      nodeAv.FFmpegError.throwIfError(r, "audio.receivePacket");
      pkt.streamIndex = this._stream.index;
      pkt.rescaleTs(this._ctx.timeBase, this._stream.timeBase);
      await muxer.writePacket(pkt);
      pkt.unref();
    }
  }
  _disposeGraph() {
    this._graph?.[Symbol.dispose]();
    this._graph = void 0;
    this._bufSrc = void 0;
    this._bufSink = void 0;
  }
};
var FormatMuxer = class {
  _ctx;
  _opened = false;
  constructor(outPath) {
    this._ctx = new nodeAv.FormatContext();
    nodeAv.FFmpegError.throwIfError(this._ctx.allocOutputContext2(null, null, outPath), "allocOutputContext2");
  }
  addStream(codecCtx, codecTag) {
    const stream = this._ctx.newStream(null);
    stream.timeBase = codecCtx.timeBase;
    nodeAv.FFmpegError.throwIfError(stream.codecpar.fromContext(codecCtx), "codecpar.fromContext");
    if (codecTag) stream.codecpar.codecTag = codecTag;
    return stream;
  }
  async open() {
    if (this._opened) return;
    nodeAv.FFmpegError.throwIfError(await this._ctx.openOutput(), "openOutput");
    nodeAv.FFmpegError.throwIfError(await this._ctx.writeHeader(null), "writeHeader");
    this._opened = true;
  }
  async writePacket(pkt) {
    nodeAv.FFmpegError.throwIfError(await this._ctx.interleavedWriteFrame(pkt), "interleavedWriteFrame");
  }
  async finish() {
    if (!this._opened) return;
    await this._ctx.writeTrailer();
    await this._ctx.closeOutput();
    this._opened = false;
  }
  async [Symbol.asyncDispose]() {
    await this.finish();
    await this._ctx[Symbol.asyncDispose]();
  }
};
var VideoEncoder = class _VideoEncoder {
  _ctx;
  _sws;
  _src;
  _dst;
  _pkt;
  _stream;
  pts = 0n;
  constructor(ctx, sws, src, dst, pkt, stream) {
    this._ctx = ctx;
    this._sws = sws;
    this._src = src;
    this._dst = dst;
    this._pkt = pkt;
    this._stream = stream;
  }
  static async create(opts) {
    const { width, height, fps, codecName, pixFmt, codecTag, globalHeader, codecOpts, bitrate, muxer } = opts;
    const codec = nodeAv.Codec.findEncoderByName(codecName);
    if (!codec) throw new Error(`Video encoder not found: ${codecName}`);
    const ctx = new nodeAv.CodecContext();
    ctx.allocContext3(codec);
    ctx.codecId = codec.id;
    ctx.width = width;
    ctx.height = height;
    ctx.pixelFormat = pixFmt;
    ctx.timeBase = new nodeAv.Rational(1, fps);
    ctx.framerate = new nodeAv.Rational(fps, 1);
    ctx.gopSize = fps;
    ctx.bitRate = BigInt(bitrate);
    ctx.setOption("threads", "4");
    if (globalHeader) ctx.setFlags(constants.AV_CODEC_FLAG_GLOBAL_HEADER);
    for (const [k, v] of Object.entries(codecOpts)) ctx.setOption(k, v);
    if (codecTag) ctx.codecTag = codecTag;
    nodeAv.FFmpegError.throwIfError(await ctx.open2(codec, null), "videoCtx.open2");
    const sws = new nodeAv.SoftwareScaleContext();
    sws.getContext(width, height, constants.AV_PIX_FMT_BGRA, width, height, pixFmt, constants.SWS_BILINEAR);
    const dst = new nodeAv.Frame();
    dst.alloc();
    dst.format = pixFmt;
    dst.width = width;
    dst.height = height;
    nodeAv.FFmpegError.throwIfError(dst.getBuffer(0), "dstFrame.getBuffer");
    const src = new nodeAv.Frame();
    src.alloc();
    src.format = constants.AV_PIX_FMT_BGRA;
    src.width = width;
    src.height = height;
    nodeAv.FFmpegError.throwIfError(src.getBuffer(0), "srcFrame.getBuffer");
    const pkt = new nodeAv.Packet();
    pkt.alloc();
    const stream = muxer.addStream(ctx, codecTag);
    return new _VideoEncoder(ctx, sws, src, dst, pkt, stream);
  }
  get stream() {
    return this._stream;
  }
  get timeBase() {
    return this._ctx.timeBase;
  }
  async encode(bgra, muxer) {
    const { _src: src, _dst: dst, _sws: sws } = this;
    nodeAv.FFmpegError.throwIfError(src.makeWritable(), "src.makeWritable");
    nodeAv.FFmpegError.throwIfError(src.fromBuffer(bgra), "src.fromBuffer");
    src.pts = this.pts;
    nodeAv.FFmpegError.throwIfError(dst.makeWritable(), "dst.makeWritable");
    nodeAv.FFmpegError.throwIfError(await sws.scaleFrame(dst, src), "sws.scaleFrame");
    dst.pts = this.pts++;
    nodeAv.FFmpegError.throwIfError(await this._ctx.sendFrame(dst), "videoCtx.sendFrame");
    await this.drain(muxer);
  }
  async flush(muxer) {
    await this._ctx.sendFrame(null);
    await this.drain(muxer);
  }
  [Symbol.dispose]() {
    this._pkt.free();
    this._src.free();
    this._dst.free();
    this._sws[Symbol.dispose]();
    this._ctx.freeContext();
  }
  async drain(muxer) {
    const pkt = this._pkt;
    while (true) {
      const r = await this._ctx.receivePacket(pkt);
      if (r === constants.AVERROR_EAGAIN || r === constants.AVERROR_EOF) break;
      nodeAv.FFmpegError.throwIfError(r, "video.receivePacket");
      pkt.streamIndex = this._stream.index;
      pkt.rescaleTs(this._ctx.timeBase, this._stream.timeBase);
      await muxer.writePacket(pkt);
      pkt.unref();
    }
  }
};

// src/base/encoder/encoder.ts
nodeAv.Log.setCallback((level, message) => {
  const msg = message.trimEnd();
  if (!msg) return;
  if (level <= constants.AV_LOG_ERROR) logger.error(msg);
  else if (level <= constants.AV_LOG_WARNING) logger.warn(msg);
});
var FORMAT_SPECS = {
  mp4: {
    videoCodecName: constants.FF_ENCODER_LIBX265,
    pixFmt: constants.AV_PIX_FMT_YUVA420P,
    codecTag: "hvc1",
    globalHeader: true,
    videoOpts: { preset: "ultrafast", "x265-params": "log-level=1" },
    audioCodecName: constants.FF_ENCODER_AAC,
    audioSampleFmt: constants.AV_SAMPLE_FMT_FLTP,
    outSampleRate: 44100
  },
  webm: {
    videoCodecName: "libvpx-vp9",
    pixFmt: constants.AV_PIX_FMT_YUVA420P,
    globalHeader: false,
    videoOpts: { quality: "realtime", "cpu-used": "8" },
    audioCodecName: "libopus",
    audioSampleFmt: constants.AV_SAMPLE_FMT_FLT,
    outSampleRate: 48e3
  }
};
var EncoderPipeline = class _EncoderPipeline {
  _states;
  constructor(states) {
    this._states = states;
  }
  static async create({
    width,
    height,
    fps,
    formats,
    outDir,
    withAudio = false,
    videoBitrate = 8e6,
    audioBitrate = 128e3
  }) {
    const states = await Promise.all(
      formats.map(async (format) => {
        const spec = FORMAT_SPECS[format];
        const outPath = path.join(outDir, `output.${format}`);
        const muxer = new FormatMuxer(outPath);
        const video = await VideoEncoder.create({
          width,
          height,
          fps,
          codecName: spec.videoCodecName,
          pixFmt: spec.pixFmt,
          codecTag: spec.codecTag,
          globalHeader: spec.globalHeader,
          codecOpts: spec.videoOpts,
          bitrate: videoBitrate,
          muxer
        });
        let audio;
        if (withAudio) {
          audio = await AudioEncoder.create({
            outSampleRate: spec.outSampleRate,
            outSampleFmt: spec.audioSampleFmt,
            codecName: spec.audioCodecName,
            globalHeader: spec.globalHeader,
            bitrate: audioBitrate,
            muxer
          });
        }
        await muxer.open();
        const limiter = new ConcurrencyLimiter(1);
        return { format, outPath, muxer, video, audio, limiter };
      })
    );
    return new _EncoderPipeline(states);
  }
  setupAudio(sampleRate) {
    for (const s of this._states) {
      s.audio?.setInputRate(sampleRate);
    }
  }
  async encodeFrame(bgra, _timestampUs) {
    await Promise.all(this._states.map((s) => s.limiter.schedule(() => s.video.encode(bgra, s.muxer))));
  }
  async encodeAudio(pcm) {
    await Promise.all(
      this._states.map((s) => {
        if (!s.audio) return Promise.resolve();
        return s.limiter.schedule(() => s.audio.encode(pcm, s.muxer));
      })
    );
  }
  async finish() {
    const result = {};
    await Promise.all(
      this._states.map(async (s) => {
        var _stack = [];
        try {
          await s.limiter.end();
          await s.audio?.flush(s.muxer);
          await s.video.flush(s.muxer);
          result[s.format] = s.outPath;
          const _a = __using(_stack, s.audio);
          const _v = __using(_stack, s.video);
          const _m = __using(_stack, s.muxer, true);
        } catch (_) {
          var _error = _, _hasError = true;
        } finally {
          var _promise = __callDispose(_stack, _error, _hasError);
          _promise && await _promise;
        }
      })
    );
    return result;
  }
};

// src/base/image.ts
function isEmpty(image) {
  const size = image.getSize();
  if (size.width === 0 || size.height === 0) return true;
  return image.isEmpty();
}
var TAG = "[AudioCapture]";
var AUDIO_CAPTURE_SCRIPT = `
(function() {
  if (window.__pup_audio_capturing__) return;
  window.__pup_audio_capturing__ = true;

  const { ipcRenderer } = require('electron');
  const capturedContexts = new WeakSet();
  const sourcedElements = new WeakSet();
  let metaSent = false;

  const origCreateMES = AudioContext.prototype.createMediaElementSource;
  AudioContext.prototype.createMediaElementSource = function(el) {
    sourcedElements.add(el);
    return origCreateMES.call(this, el);
  };

  const origConnect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function(dest, outIdx, inIdx) {
    const captureNode = dest?.context?.__pup_captureNode__;
    if (captureNode && dest === dest.context.destination && this !== captureNode) {
      origConnect.call(this, captureNode, outIdx, inIdx);
    }
    return origConnect.call(this, dest, outIdx, inIdx);
  };

  const OrigAC = window.AudioContext || window.webkitAudioContext;
  if (!OrigAC) return;

  function PatchedAC() {
    const ctx = new OrigAC(...arguments);
    if (!capturedContexts.has(ctx)) {
      capturedContexts.add(ctx);
      if (!metaSent) {
        metaSent = true;
        ipcRenderer.send('audio-meta', { sampleRate: ctx.sampleRate });
      }
      const node = ctx.createScriptProcessor(4096, 2, 2);
      node.onaudioprocess = (e) => {
        const L = e.inputBuffer.getChannelData(0);
        const R = e.inputBuffer.getChannelData(1);
        const out = new Float32Array(L.length * 2);
        for (let i = 0; i < L.length; i++) {
          out[i * 2] = L[i];
          out[i * 2 + 1] = R[i];
        }
        ipcRenderer.send('audio-chunk', Buffer.from(out.buffer));
      };
      node.connect(ctx.destination);
      ctx.__pup_captureNode__ = node;
    }
    return ctx;
  }
  PatchedAC.prototype = OrigAC.prototype;
  Object.setPrototypeOf(PatchedAC, OrigAC);
  window.AudioContext = PatchedAC;
  if ('webkitAudioContext' in window) window.webkitAudioContext = PatchedAC;

  const origPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function() {
    if (!this.__pup_captured__) {
      this.__pup_captured__ = true;
      const el = this;
      Promise.resolve().then(() => {
        if (!sourcedElements.has(el)) {
          const ctx = new PatchedAC();
          ctx.createMediaElementSource(el).connect(ctx.destination);
        }
      });
    }
    return origPlay.call(this);
  };
})();
`;
async function setupAudioCapture(pipeline) {
  const preloadPath = path.join(os.tmpdir(), `pup_audio_preload_${crypto.randomUUID()}.js`);
  await promises.writeFile(preloadPath, AUDIO_CAPTURE_SCRIPT);
  electron.session.defaultSession.registerPreloadScript({
    type: "frame",
    id: "pup-audio",
    filePath: preloadPath
  });
  electron.ipcMain.once("audio-meta", (_e, data) => {
    pipeline.setupAudio(data.sampleRate);
  });
  electron.ipcMain.on("audio-chunk", async (_e, buffer) => {
    try {
      await pipeline.encodeAudio(buffer);
    } catch (e) {
      logger.error(TAG, "failed to encode audio chunk:", e);
    }
  });
  return {
    async teardown() {
      electron.ipcMain.removeAllListeners("audio-meta");
      electron.ipcMain.removeAllListeners("audio-chunk");
      electron.session.defaultSession.unregisterPreloadScript("pup-audio");
      await promises.rm(preloadPath, { force: true });
    }
  };
}

// src/renderer/frame_sync.ts
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

// src/base/timing.ts
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// src/base/retry.ts
function useRetry({ fn, maxAttempts = 3, timeout }) {
  const timeoutError = new Error(`timeout over ${timeout}ms`);
  return async function(...args) {
    let attempt = 0;
    while (true) {
      try {
        const promises = [fn(...args)];
        if (timeout) {
          promises.push(
            promises$1.setTimeout(timeout).then(() => {
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

// src/renderer/html_check.ts
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

// src/base/waitable_event.ts
var WaitableEvent = class {
  _promise;
  _resolve;
  _timeoutToken;
  wait(options) {
    if (this._promise) {
      throw new Error("already waiting");
    }
    this._promise = new Promise((resolve) => {
      this._resolve = resolve;
      if (options?.timeout !== void 0) {
        this._timeoutToken = setTimeout(() => {
          options.onTimeout?.();
          resolve();
        }, options.timeout);
      }
    });
    return this._promise;
  }
  signal() {
    clearTimeout(this._timeoutToken);
    this._promise = void 0;
    this._resolve?.();
  }
};

// src/renderer/network.ts
var TAG2 = "[Network]";
var map = /* @__PURE__ */ new Map([
  [`jssz-boss.hdslb.com`, `jssz-boss.bilibili.co`],
  //
  [`boss.hdslb.com`, `shjd-boss.bilibili.co`]
]);
function proxiedUrl(url$1) {
  if (!url$1.startsWith("http")) {
    return url$1;
  }
  const parsed = new url.URL(url$1);
  const target = map.get(parsed.hostname);
  if (!target) {
    return url$1;
  }
  parsed.hostname = target;
  parsed.protocol = "http:";
  return parsed.toString();
}
function setInterceptor({ source, window, useInnerProxy }) {
  const req = window.webContents.session.webRequest;
  const limiter = new ConcurrencyLimiter(64);
  const events = /* @__PURE__ */ new Map();
  async function wait(key, onTimeout) {
    const event = new WaitableEvent();
    events.set(key, event);
    await event.wait({ timeout: 5e3, onTimeout }).finally(() => events.delete(key));
  }
  function signal(key) {
    events.get(key)?.signal();
  }
  req.onBeforeRequest((details, callback) => {
    const url = details.url;
    const proxied = useInnerProxy ? proxiedUrl(url) : url;
    limiter.schedule(() => {
      const key = `${window.id}_${details.id}`;
      logger.debug(TAG2, `start:`, {
        key,
        url,
        proxied,
        method: details.method,
        source,
        stats: limiter.stats
      });
      if (proxied === url) {
        callback({ cancel: false });
      } else {
        callback({ cancel: false, redirectURL: proxied });
      }
      return wait(key, () => {
        logger.warn(TAG2, `maybe timeout:`, {
          key,
          url,
          proxied,
          method: details.method,
          source
        });
      });
    });
  });
  req.onHeadersReceived(({ responseHeaders }, callback) => {
    delete responseHeaders?.["x-frame-options"];
    delete responseHeaders?.["X-Frame-Options"];
    delete responseHeaders?.["content-security-policy"];
    delete responseHeaders?.["Content-Security-Policy"];
    callback({ cancel: false, responseHeaders });
  });
  req.onCompleted((details) => {
    const key = `${window.id}_${details.id}`;
    signal(key);
    logger.debug(TAG2, `completed:`, {
      key,
      url: details.url,
      method: details.method,
      statusCode: details.statusCode,
      source
    });
  });
  req.onErrorOccurred((details) => {
    const key = `${window.id}_${details.id}`;
    signal(key);
    logger.error(TAG2, `error:`, {
      key,
      url: details.url,
      method: details.method,
      error: details.error,
      source
    });
  });
}
function unsetInterceptor(window) {
  const req = window.webContents.session.webRequest;
  req.onBeforeRequest(null);
  req.onHeadersReceived(null);
  req.onCompleted(null);
  req.onErrorOccurred(null);
}

// src/renderer/window.ts
var TAG3 = "[Window]";
function waitForFinish(win, action) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("load window timeout")), 3e4);
    const done = (err) => {
      clearTimeout(timeout);
      err ? reject(err) : resolve();
    };
    win.webContents.once("did-finish-load", () => done());
    win.webContents.once(
      "did-fail-load",
      (_e, code, desc, url) => done(new Error(`failed to load ${url}: [${code}] ${desc}`))
    );
    win.webContents.once(
      "render-process-gone",
      (_e, { exitCode, reason }) => done(new Error(`renderer crashed: ${exitCode}, ${reason}`))
    );
    action();
  });
}
async function openWindow(wins, source, options) {
  checkHTML(source);
  const { width, height, useInnerProxy } = options;
  let src = source;
  if (useInnerProxy) {
    src = proxiedUrl(source);
  }
  wins.forEach((w) => {
    w.webContents.removeAllListeners();
    unsetInterceptor(w);
    logger.debug(TAG3, `destroy window:`, w.id);
  });
  const win = new electron.BrowserWindow({
    width,
    height: height + 1,
    show: false,
    transparent: true,
    backgroundColor: void 0,
    webPreferences: {
      offscreen: true,
      backgroundThrottling: false,
      nodeIntegration: true,
      nodeIntegrationInSubFrames: true,
      nodeIntegrationInWorker: true,
      contextIsolation: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
      experimentalFeatures: true
    }
  });
  setInterceptor({ source, window: win, useInnerProxy });
  wins.splice(0).forEach((w) => w.destroy());
  wins.push(win);
  win.webContents.on("console-message", ({ level, message, lineNumber, sourceId }) => {
    if (level === "error") {
      logger.error(TAG3, "console:", {
        message,
        lineNumber,
        sourceId,
        source
      });
    }
  });
  const wrapperHTML = buildWrapperHTML(src, { width, height });
  const dataURL = `data:text/html;charset=utf-8,${encodeURIComponent(wrapperHTML)}`;
  await waitForFinish(win, () => win.loadURL(dataURL));
  return win;
}
async function loadWindow(source, options) {
  try {
    const wins = [];
    await useRetry({ fn: openWindow, maxAttempts: 2 })(wins, source, options);
    return await openWindow(wins, source, options);
  } catch (e) {
    const { message, stack } = e;
    const desc = { source, message, stack };
    throw new Error(`failed to load window: ${JSON.stringify(desc)}`);
  }
}

// src/renderer/render.ts
var TAG4 = "[Render]";
async function render(source, options) {
  logger.info(TAG4, `progress: 0%`);
  const { outDir, fps, width, height, duration, withAudio, formats } = options;
  await promises.mkdir(outDir, { recursive: true });
  const pipeline = await EncoderPipeline.create({ width, height, fps, formats, outDir, withAudio });
  const audioCapture = withAudio ? await setupAudioCapture(pipeline) : void 0;
  const win = await loadWindow(source, options);
  try {
    const cdp = win.webContents.debugger;
    cdp.attach("1.3");
    win.webContents.setFrameRate(fps);
    if (!win.webContents.isPainting()) {
      win.webContents.startPainting();
    }
    const total = Math.ceil(fps * duration);
    const frameInterval = 1e3 / fps;
    let written = 0;
    let lastWrittenTime;
    let progress = 0;
    let frameError;
    let resolver;
    let rejecter;
    let coverBgra;
    const encodeQueue = new ConcurrencyLimiter(1);
    const scheduleFrame = (frame, timestampUs) => {
      written++;
      const t0 = performance.now();
      encodeQueue.schedule(() => pipeline.encodeFrame(frame, timestampUs)).catch((e) => frameError ??= e);
      const diff = performance.now() - t0;
      if (diff > frameInterval * 1.2) {
        logger.warn(TAG4, `frame stalled in ${diff}ms`);
      }
    };
    const paint = (_e, _r, image) => {
      if (frameError) {
        rejecter?.(frameError);
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
      const cropped = Buffer.from(bitmap.buffer, bitmap.byteOffset, height * bytesPerRow);
      coverBgra ??= cropped;
      if (lastWrittenTime === void 0) {
        scheduleFrame(cropped, currentTime * 1e3);
        lastWrittenTime = currentTime;
      } else {
        const timeDelta = currentTime - lastWrittenTime;
        if (timeDelta >= frameInterval * 0.8) {
          if (timeDelta <= frameInterval * 1.2) {
            scheduleFrame(cropped, currentTime * 1e3);
          } else {
            const framesToInsert = Math.round(timeDelta / frameInterval);
            for (let i = 0; i < framesToInsert && written < total; i++) {
              scheduleFrame(cropped, Math.round((lastWrittenTime + (i + 1) * frameInterval) * 1e3));
            }
          }
          lastWrittenTime = currentTime;
        }
      }
      const newProgress = Math.floor(written / total * 100);
      if (Math.abs(newProgress - progress) > 10) {
        progress = newProgress;
        logger.info(TAG4, `progress: ${Math.round(progress)}%`);
      }
      const durationMs = duration * 1e3;
      if (currentTime >= durationMs - frameInterval * 0.5 || written >= total) {
        resolver?.();
      }
    };
    win.webContents.on("paint", paint);
    await startSync(cdp);
    try {
      await new Promise((r, j) => [resolver, rejecter] = [r, j]);
    } finally {
      await stopSync(cdp);
      win.webContents.off("paint", paint);
      await audioCapture?.teardown();
    }
    if (frameError || written === 0) {
      throw frameError ?? new Error("no frames captured");
    }
    await encodeQueue.end();
    const outputFiles = await pipeline.finish();
    const coverPath = path.join(outDir, "cover.png");
    assert.ok(coverBgra, "cover image is missing");
    const png = electron.nativeImage.createFromBuffer(coverBgra, { width, height }).toPNG();
    await promises.writeFile(coverPath, png);
    const result = {
      options,
      written,
      files: { ...outputFiles, cover: coverPath }
    };
    await promises.writeFile(path.join(outDir, "summary.json"), JSON.stringify(result));
    logger.info(TAG4, `progress: 100%, ${written} frames written`);
  } finally {
    win.close();
  }
}

// src/base/cdp.ts
function advanceVirtualTime(cdp, budget) {
  return new Promise((resolve) => {
    const handler = (_, method) => {
      if (method === "Emulation.virtualTimeBudgetExpired") {
        cdp.off("message", handler);
        resolve();
      }
    };
    cdp.on("message", handler);
    cdp.sendCommand("Emulation.setVirtualTimePolicy", {
      policy: "advance",
      budget
    });
  });
}

// src/renderer/shoot.ts
var TAG5 = "[Shoot]";
function tickAnims(tick) {
  return `document.getAnimations().forEach((a) => {
    a.pause();
    a.currentTime += ${tick};
  })`;
}
function awaitStegoFrame(win, width, height, afterTs, frameIndex) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`frame ${frameIndex} paint timeout`)), 1e3);
    const handler = (_e, _d, image) => {
      if (isEmpty(image)) return;
      const bitmap = image.toBitmap();
      const ts = decodeTimestamp(bitmap, image.getSize());
      if (ts === void 0 || ts <= afterTs) return;
      clearTimeout(timeout);
      win.webContents.off("paint", handler);
      resolve(Buffer.from(bitmap.buffer, bitmap.byteOffset, height * width * 4));
    };
    win.webContents.on("paint", handler);
  });
}
async function shoot(source, options) {
  const { outDir, fps, width, height, duration, withAudio, formats } = options;
  if (withAudio) {
    logger.warn(TAG5, "Audio capture is not supported in deterministic mode");
  }
  logger.info(TAG5, `progress: 0%`);
  await promises.mkdir(outDir, { recursive: true });
  const win = await loadWindow(source, options);
  try {
    const cdp = win.webContents.debugger;
    cdp.attach("1.3");
    win.webContents.setFrameRate(240);
    const rootFrame = win.webContents.mainFrame.frames[0];
    await rootFrame?.executeJavaScript(tickAnims(0));
    if (!win.webContents.isPainting()) {
      win.webContents.startPainting();
    }
    await startSync(cdp);
    const pipeline = await EncoderPipeline.create({ width, height, fps, formats, outDir, withAudio });
    const total = Math.ceil(fps * duration);
    const frameInterval = 1e3 / fps;
    const frameIntervalUs = Math.round(1e6 / fps);
    let written = 0;
    let progress = 0;
    let coverBgra;
    try {
      for (let frame = 0; frame < total; frame++) {
        const frameMs = (frame + 1) * frameInterval;
        const pending = awaitStegoFrame(win, width, height, frameMs - 1, frame);
        await advanceVirtualTime(cdp, frameInterval);
        await rootFrame?.executeJavaScript(tickAnims(frameInterval));
        const bitmap = await pending;
        if (frame === 0) {
          coverBgra = bitmap;
        }
        await pipeline.encodeFrame(bitmap, frame * frameIntervalUs);
        written++;
        const newProgress = Math.floor(written / total * 100);
        if (Math.abs(newProgress - progress) > 10) {
          progress = newProgress;
          logger.info(TAG5, `progress: ${Math.round(progress)}%`);
        }
      }
    } finally {
      await stopSync(cdp);
      cdp.detach();
    }
    if (written === 0) {
      throw new Error("no frames captured");
    }
    const outputFiles = await pipeline.finish();
    const coverPath = path.join(outDir, "cover.png");
    assert.ok(coverBgra, "cover image is missing");
    const png = electron.nativeImage.createFromBuffer(coverBgra, { width, height }).toPNG();
    await promises.writeFile(coverPath, png);
    const result = {
      options,
      written,
      files: { ...outputFiles, cover: coverPath }
    };
    await promises.writeFile(path.join(outDir, "summary.json"), JSON.stringify(result));
    logger.info(TAG5, `progress: 100%, ${written} frames written`);
  } finally {
    win.close();
  }
}

// src/app.ts
process.once("exit", () => electron.app.quit());
var TAG6 = "[App]";
function printFeatures() {
  logger.debug(TAG6, "gpu features:", electron.app.getGPUFeatureStatus());
}
electron.app.dock?.hide();
makeCLI("app", async (source, options) => {
  try {
    electron.app.on("gpu-info-update", printFeatures);
    await electron.app.whenReady();
    printFeatures();
    const action = options.deterministic ? shoot : render;
    await action(source, options);
  } finally {
    electron.app.quit();
  }
});
//# sourceMappingURL=app.cjs.map
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL25vZGVfbW9kdWxlcy8uYnVuL3RzdXBAOC41LjErMDdhMGQ2MWJiMDc1MTRlZS9ub2RlX21vZHVsZXMvdHN1cC9hc3NldHMvY2pzX3NoaW1zLmpzIiwiLi4vc3JjL2Jhc2UvZW52LnRzIiwiLi4vc3JjL2Jhc2UvcGFyc2VyLnRzIiwiLi4vc3JjL2Jhc2UvY29uc3RhbnRzLnRzIiwiLi4vc3JjL2Jhc2UvbG9nZ2luZy50cyIsIi4uL3NyYy9iYXNlL25vZXJyLnRzIiwiLi4vc3JjL2Jhc2UvcHJvY2Vzcy50cyIsIi4uL3NyYy9yZW5kZXJlci9zY2hlbWEudHMiLCIuLi9zcmMvY29tbW9uLnRzIiwiLi4vc3JjL2Jhc2UvbGltaXRlci50cyIsIi4uL3NyYy9iYXNlL2VuY29kZXIvYXVkaW8udHMiLCIuLi9zcmMvYmFzZS9lbmNvZGVyL211eGVyLnRzIiwiLi4vc3JjL2Jhc2UvZW5jb2Rlci92aWRlby50cyIsIi4uL3NyYy9iYXNlL2VuY29kZXIvZW5jb2Rlci50cyIsIi4uL3NyYy9iYXNlL2ltYWdlLnRzIiwiLi4vc3JjL3JlbmRlcmVyL2F1ZGlvX2NhcHR1cmUudHMiLCIuLi9zcmMvcmVuZGVyZXIvZnJhbWVfc3luYy50cyIsIi4uL3NyYy9iYXNlL3RpbWluZy50cyIsIi4uL3NyYy9iYXNlL3JldHJ5LnRzIiwiLi4vc3JjL3JlbmRlcmVyL2h0bWxfY2hlY2sudHMiLCIuLi9zcmMvYmFzZS93YWl0YWJsZV9ldmVudC50cyIsIi4uL3NyYy9yZW5kZXJlci9uZXR3b3JrLnRzIiwiLi4vc3JjL3JlbmRlcmVyL3dpbmRvdy50cyIsIi4uL3NyYy9yZW5kZXJlci9yZW5kZXIudHMiLCIuLi9zcmMvYmFzZS9jZHAudHMiLCIuLi9zcmMvcmVuZGVyZXIvc2hvb3QudHMiLCIuLi9zcmMvYXBwLnRzIl0sIm5hbWVzIjpbInJlcXVpcmUiLCJjcmVhdGVSZXF1aXJlIiwiZGlybmFtZSIsImpvaW4iLCJ6IiwicHJvZ3JhbSIsIkFWX1NBTVBMRV9GTVRfRkxUIiwiQVZfU0FNUExFX0ZNVF9GTFRQIiwiUGFja2V0IiwiRnJhbWUiLCJDb2RlYyIsIkNvZGVjQ29udGV4dCIsIkFWX0NIQU5ORUxfTEFZT1VUX1NURVJFTyIsIlJhdGlvbmFsIiwiQVZfQ09ERUNfRkxBR19HTE9CQUxfSEVBREVSIiwiRkZtcGVnRXJyb3IiLCJGaWx0ZXJHcmFwaCIsIkZpbHRlciIsIkZpbHRlckluT3V0IiwiQVZFUlJPUl9FQUdBSU4iLCJBVkVSUk9SX0VPRiIsIkZvcm1hdENvbnRleHQiLCJTb2Z0d2FyZVNjYWxlQ29udGV4dCIsIkFWX1BJWF9GTVRfQkdSQSIsIlNXU19CSUxJTkVBUiIsIkxvZyIsIkFWX0xPR19FUlJPUiIsIkFWX0xPR19XQVJOSU5HIiwiRkZfRU5DT0RFUl9MSUJYMjY1IiwiQVZfUElYX0ZNVF9ZVVZBNDIwUCIsIkZGX0VOQ09ERVJfQUFDIiwidG1wZGlyIiwicmFuZG9tVVVJRCIsIndyaXRlRmlsZSIsInNlc3Npb24iLCJpcGNNYWluIiwicm0iLCJzZXRUaW1lb3V0IiwiVEFHIiwidXJsIiwiVVJMIiwiQnJvd3NlcldpbmRvdyIsIm1rZGlyIiwib2siLCJuYXRpdmVJbWFnZSIsImFwcCJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFLQSxJQUFNLGdCQUFBLEdBQW1CLE1BQ3ZCLE9BQU8sUUFBQSxLQUFhLFdBQUEsR0FDaEIsSUFBSSxHQUFBLENBQUksQ0FBQSxLQUFBLEVBQVEsVUFBVSxDQUFBLENBQUUsQ0FBQSxDQUFFLElBQUEsR0FDN0IsUUFBQSxDQUFTLGFBQUEsSUFBaUIsUUFBQSxDQUFTLGFBQUEsQ0FBYyxPQUFBLENBQVEsV0FBQSxFQUFZLEtBQU0sUUFBQSxHQUMxRSxRQUFBLENBQVMsYUFBQSxDQUFjLEdBQUEsR0FDdkIsSUFBSSxHQUFBLENBQUksU0FBQSxFQUFXLFFBQUEsQ0FBUyxPQUFPLENB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QSxFQUFjO0FBQ2QsSUFBQSxNQUFNLE1BQUEsR0FBUyxPQUFBLENBQVEsYUFBQSxHQUFnQixLQUFBLEdBQVEsTUFBQTtBQUMvQyxJQUFBLE1BQU0sTUFBQSxDQUFPLFFBQVEsT0FBTyxDQUFBO0FBQUEsRUFDOUIsQ0FBQSxTQUFFO0FBQ0EsSUFBQUEsWUFBQSxDQUFJLElBQUEsRUFBSztBQUFBLEVBQ1g7QUFDRixDQUFDLENBQUEiLCJmaWxlIjoiYXBwLmNqcyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFNoaW0gZ2xvYmFscyBpbiBjanMgYnVuZGxlXG4vLyBUaGVyZSdzIGEgd2VpcmQgYnVnIHRoYXQgZXNidWlsZCB3aWxsIGFsd2F5cyBpbmplY3QgaW1wb3J0TWV0YVVybFxuLy8gaWYgd2UgZXhwb3J0IGl0IGFzIGBjb25zdCBpbXBvcnRNZXRhVXJsID0gLi4uIF9fZmlsZW5hbWUgLi4uYFxuLy8gQnV0IHVzaW5nIGEgZnVuY3Rpb24gd2lsbCBub3QgY2F1c2UgdGhpcyBpc3N1ZVxuXG5jb25zdCBnZXRJbXBvcnRNZXRhVXJsID0gKCkgPT4gXG4gIHR5cGVvZiBkb2N1bWVudCA9PT0gXCJ1bmRlZmluZWRcIiBcbiAgICA/IG5ldyBVUkwoYGZpbGU6JHtfX2ZpbGVuYW1lfWApLmhyZWYgXG4gICAgOiAoZG9jdW1lbnQuY3VycmVudFNjcmlwdCAmJiBkb2N1bWVudC5jdXJyZW50U2NyaXB0LnRhZ05hbWUudG9VcHBlckNhc2UoKSA9PT0gJ1NDUklQVCcpIFxuICAgICAgPyBkb2N1bWVudC5jdXJyZW50U2NyaXB0LnNyYyBcbiAgICAgIDogbmV3IFVSTChcIm1haW4uanNcIiwgZG9jdW1lbnQuYmFzZVVSSSkuaHJlZjtcblxuZXhwb3J0IGNvbnN0IGltcG9ydE1ldGFVcmwgPSAvKiBAX19QVVJFX18gKi8gZ2V0SW1wb3J0TWV0YVVybCgpXG4iLCIvLyBDcmVhdGVkIGJ5IEF1dG9rYWthIChxcTE5MDk2OTg0OTRAZ21haWwuY29tKSBvbiAyMDI2LzAyLzI1LlxuXG5leHBvcnQgdHlwZSBFbnZQYXJzZXI8VD4gPSAodmFsdWU6IHVua25vd24pID0+IFQ7XG5cbmV4cG9ydCBmdW5jdGlvbiBwZW52PFQ+KG5hbWU6IHN0cmluZywgcGFyc2VyOiBFbnZQYXJzZXI8VD4sIGRlZmF1bHRWYWx1ZTogVCk6IFQ7XG5leHBvcnQgZnVuY3Rpb24gcGVudjxUPihuYW1lOiBzdHJpbmcsIHBhcnNlcjogRW52UGFyc2VyPFQ+LCBkZWZhdWx0VmFsdWU/OiBUKTogVCB8IHVuZGVmaW5lZDtcbmV4cG9ydCBmdW5jdGlvbiBwZW52PFQ+KG5hbWU6IHN0cmluZywgcGFyc2VyOiBFbnZQYXJzZXI8VD4sIGRlZmF1bHRWYWx1ZT86IFQpOiBUIHwgdW5kZWZpbmVkIHtcbiAgdHJ5IHtcbiAgICByZXR1cm4gcGFyc2VyKHByb2Nlc3MuZW52W25hbWVdKTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGRlZmF1bHRWYWx1ZTtcbiAgfVxufVxuIiwiLy8gQ3JlYXRlZCBieSBBdXRva2FrYSAocXExOTA5Njk4NDk0QGdtYWlsLmNvbSkgb24gMjAyNi8wMS8zMC5cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlTnVtYmVyKHg6IHVua25vd24pOiBudW1iZXIge1xuICBpZiAodHlwZW9mIHggPT09IFwibnVtYmVyXCIpIHtcbiAgICByZXR1cm4geDtcbiAgfVxuICBjb25zdCBudW0gPSBOdW1iZXIoeCk7XG4gIGlmIChOdW1iZXIuaXNOYU4obnVtKSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgVmFsdWUgJHt4fSBpcyBub3QgYSB2YWxpZCBudW1iZXJgKTtcbiAgfVxuICByZXR1cm4gbnVtO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VTdHJpbmcoeDogdW5rbm93bik6IHN0cmluZyB7XG4gIGlmICh0eXBlb2YgeCA9PT0gXCJzdHJpbmdcIikgcmV0dXJuIHg7XG4gIHJldHVybiBTdHJpbmcoeCk7XG59XG4iLCIvLyBDcmVhdGVkIGJ5IEF1dG9rYWthIChxcTE5MDk2OTg0OTRAZ21haWwuY29tKSBvbiAyMDI2LzAyLzA5LlxuXG5pbXBvcnQgeyBjcmVhdGVSZXF1aXJlIH0gZnJvbSBcIm1vZHVsZVwiO1xuaW1wb3J0IHsgZGlybmFtZSwgam9pbiB9IGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBwZW52IH0gZnJvbSBcIi4vZW52XCI7XG5pbXBvcnQgeyBwYXJzZU51bWJlciB9IGZyb20gXCIuL3BhcnNlclwiO1xuXG5jb25zdCByZXF1aXJlID0gY3JlYXRlUmVxdWlyZShpbXBvcnQubWV0YS51cmwpO1xuY29uc3QgZW52ID0gcHJvY2Vzcy5lbnY7XG5cbmV4cG9ydCBjb25zdCBwdXBMb2dMZXZlbCA9IHBlbnYoXCJQVVBfTE9HX0xFVkVMXCIsIHBhcnNlTnVtYmVyLCAyKTtcbmV4cG9ydCBjb25zdCBwdXBVc2VJbm5lclByb3h5ID0gZW52W1wiUFVQX1VTRV9JTk5FUl9QUk9YWVwiXSA9PT0gXCIxXCI7XG5leHBvcnQgY29uc3QgcHVwRGlzYWJsZUdQVSA9IGVudltcIlBVUF9ESVNBQkxFX0dQVVwiXSA9PT0gXCIxXCI7XG5cbmV4cG9ydCBjb25zdCBwdXBQa2dSb290ID0gZGlybmFtZShyZXF1aXJlLnJlc29sdmUoXCJwdXAtcmVjb3JkZXIvcGFja2FnZS5qc29uXCIpKTtcbmV4cG9ydCBjb25zdCBwdXBBcHAgPSBqb2luKHB1cFBrZ1Jvb3QsIFwiZGlzdFwiLCBcImFwcC5janNcIik7XG4iLCIvLyBDcmVhdGVkIGJ5IEF1dG9rYWthIChxcTE5MDk2OTg0OTRAZ21haWwuY29tKSBvbiAyMDI2LzAyLzA2LlxuXG5pbXBvcnQgeyBDaGlsZFByb2Nlc3MsIHR5cGUgU2VyaWFsaXphYmxlIH0gZnJvbSBcImNoaWxkX3Byb2Nlc3NcIjtcbmltcG9ydCB7IHB1cExvZ0xldmVsIH0gZnJvbSBcIi4vY29uc3RhbnRzXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgTG9nZ2VyTGlrZSB7XG4gIGRlYnVnPyh0aGlzOiB2b2lkLCAuLi5tZXNzYWdlczogdW5rbm93bltdKTogdm9pZDtcblxuICBpbmZvPyh0aGlzOiB2b2lkLCAuLi5tZXNzYWdlczogdW5rbm93bltdKTogdm9pZDtcblxuICB3YXJuPyh0aGlzOiB2b2lkLCAuLi5tZXNzYWdlczogdW5rbm93bltdKTogdm9pZDtcblxuICBlcnJvcj8odGhpczogdm9pZCwgLi4ubWVzc2FnZXM6IHVua25vd25bXSk6IHZvaWQ7XG59XG5cbmNvbnN0IERFQlVHID0gXCI8cHVwQGRlYnVnPlwiO1xuY29uc3QgSU5GTyA9IFwiPHB1cEBpbmZvPlwiO1xuY29uc3QgV0FSTiA9IFwiPHB1cEB3YXJuPlwiO1xuY29uc3QgRVJST1IgPSBcIjxwdXBAZXJyb3I+XCI7XG5jb25zdCBGQVRBTCA9IFwiPHB1cEBmYXRhbD5cIjtcblxuZnVuY3Rpb24gc3RhY2tIb29rKHRhcmdldDogRnVuY3Rpb24sIF9jb250ZXh0OiBDbGFzc01ldGhvZERlY29yYXRvckNvbnRleHQpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uICh0aGlzOiBMb2dnZXIsIC4uLm1lc3NhZ2VzOiB1bmtub3duW10pIHtcbiAgICBjb25zdCBwcm9jZXNzZWQgPSBtZXNzYWdlcy5tYXAoKG1zZykgPT4ge1xuICAgICAgcmV0dXJuIG1zZyBpbnN0YW5jZW9mIEVycm9yID8gKG1zZy5zdGFjayA/PyBTdHJpbmcobXNnKSkgOiBtc2c7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRhcmdldC5jYWxsKHRoaXMsIC4uLnByb2Nlc3NlZCk7XG4gIH07XG59XG5cbmV4cG9ydCBjbGFzcyBMb2dnZXIgaW1wbGVtZW50cyBMb2dnZXJMaWtlIHtcbiAgcHJpdmF0ZSBfaW1wbD86IExvZ2dlckxpa2U7XG5cbiAgZ2V0IGxldmVsKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX2xldmVsO1xuICB9XG5cbiAgc2V0IGxldmVsKHZhbHVlOiBudW1iZXIpIHtcbiAgICB0aGlzLl9sZXZlbCA9IHZhbHVlO1xuICAgIHRoaXMuaW1wbCA9IHRoaXMuX2ltcGwgPz8gY29uc29sZTtcbiAgfVxuXG4gIGdldCBpbXBsKCk6IExvZ2dlckxpa2UgfCB1bmRlZmluZWQge1xuICAgIHJldHVybiB0aGlzLl9pbXBsO1xuICB9XG5cbiAgc2V0IGltcGwodmFsdWU6IExvZ2dlckxpa2UpIHtcbiAgICBjb25zdCBkZWJ1ZyA9IHZhbHVlLmRlYnVnID8/IGNvbnNvbGUuZGVidWc7XG4gICAgY29uc3QgaW5mbyA9IHZhbHVlLmluZm8gPz8gY29uc29sZS5pbmZvO1xuICAgIGNvbnN0IHdhcm4gPSB2YWx1ZS53YXJuID8/IGNvbnNvbGUud2FybjtcbiAgICBjb25zdCBlcnJvciA9IHZhbHVlLmVycm9yID8/IGNvbnNvbGUuZXJyb3I7XG4gICAgY29uc3QgbHYgPSB0aGlzLl9sZXZlbDtcbiAgICB0aGlzLl9pbXBsID0ge1xuICAgICAgZGVidWc6IGx2ID49IDMgPyBkZWJ1ZyA6IHVuZGVmaW5lZCxcbiAgICAgIGluZm86IGx2ID49IDIgPyBpbmZvIDogdW5kZWZpbmVkLFxuICAgICAgd2FybjogbHYgPj0gMSA/IHdhcm4gOiB1bmRlZmluZWQsXG4gICAgICBlcnJvcjogbHYgPj0gMCA/IGVycm9yIDogdW5kZWZpbmVkLFxuICAgIH07XG4gIH1cblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIF9sZXZlbDogbnVtYmVyID0gcHVwTG9nTGV2ZWwpIHtcbiAgICB0aGlzLmltcGwgPSBjb25zb2xlO1xuICB9XG5cbiAgQHN0YWNrSG9va1xuICBkZWJ1ZyguLi5tZXNzYWdlczogdW5rbm93bltdKTogdm9pZCB7XG4gICAgdGhpcy5pbXBsPy5kZWJ1Zz8uKERFQlVHLCAuLi5tZXNzYWdlcyk7XG4gIH1cblxuICBAc3RhY2tIb29rXG4gIGluZm8oLi4ubWVzc2FnZXM6IHVua25vd25bXSk6IHZvaWQge1xuICAgIHRoaXMuaW1wbD8uaW5mbz8uKElORk8sIC4uLm1lc3NhZ2VzKTtcbiAgfVxuXG4gIEBzdGFja0hvb2tcbiAgd2FybiguLi5tZXNzYWdlczogdW5rbm93bltdKTogdm9pZCB7XG4gICAgdGhpcy5pbXBsPy53YXJuPy4oV0FSTiwgLi4ubWVzc2FnZXMpO1xuICB9XG5cbiAgQHN0YWNrSG9va1xuICBlcnJvciguLi5tZXNzYWdlczogdW5rbm93bltdKTogdm9pZCB7XG4gICAgdGhpcy5pbXBsPy5lcnJvcj8uKEVSUk9SLCAuLi5tZXNzYWdlcyk7XG4gIH1cblxuICBAc3RhY2tIb29rXG4gIGZhdGFsKC4uLm1lc3NhZ2VzOiB1bmtub3duW10pOiB2b2lkIHtcbiAgICB0aGlzLmltcGw/LmVycm9yPy4oRkFUQUwsIC4uLm1lc3NhZ2VzKTtcbiAgICBwcm9jZXNzLmV4aXQoMSk7XG4gIH1cblxuICBwcml2YXRlIGRpc3BhdGNoKG1lc3NhZ2U6IHN0cmluZykge1xuICAgIGlmIChtZXNzYWdlLnN0YXJ0c1dpdGgoREVCVUcpKSB7XG4gICAgICB0aGlzLmRlYnVnKG1lc3NhZ2Uuc2xpY2UoREVCVUcubGVuZ3RoICsgMSkpO1xuICAgIH0gZWxzZSBpZiAobWVzc2FnZS5zdGFydHNXaXRoKElORk8pKSB7XG4gICAgICB0aGlzLmluZm8obWVzc2FnZS5zbGljZShJTkZPLmxlbmd0aCArIDEpKTtcbiAgICB9IGVsc2UgaWYgKG1lc3NhZ2Uuc3RhcnRzV2l0aChXQVJOKSkge1xuICAgICAgdGhpcy53YXJuKG1lc3NhZ2Uuc2xpY2UoV0FSTi5sZW5ndGggKyAxKSk7XG4gICAgfSBlbHNlIGlmIChtZXNzYWdlLnN0YXJ0c1dpdGgoRVJST1IpKSB7XG4gICAgICB0aGlzLmVycm9yKG1lc3NhZ2Uuc2xpY2UoRVJST1IubGVuZ3RoICsgMSkpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmluZm8obWVzc2FnZSk7XG4gICAgfVxuICB9XG5cbiAgYXR0YWNoKHByb2M6IENoaWxkUHJvY2VzcywgbmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHRoaXMuZGVidWcoYCR7bmFtZX0uYXR0YWNoYCk7XG4gICAgICBsZXQgZmF0YWw6IHN0cmluZyA9IFwiXCI7XG4gICAgICBjb25zdCBkaXNwYXRjaCA9IChkYXRhOiBCdWZmZXIgfCBTZXJpYWxpemFibGUpID0+IHtcbiAgICAgICAgY29uc3QgbWVzc2FnZSA9IGRhdGEudG9TdHJpbmcoKTtcbiAgICAgICAgaWYgKG1lc3NhZ2Uuc3RhcnRzV2l0aChGQVRBTCkpIHtcbiAgICAgICAgICBmYXRhbCArPSBtZXNzYWdlLnNsaWNlKEZBVEFMLmxlbmd0aCArIDEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRoaXMuZGlzcGF0Y2gobWVzc2FnZSk7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBwcm9jLnN0ZGVycj8ub24oXCJkYXRhXCIsIGRpc3BhdGNoKTtcbiAgICAgIHByb2Muc3Rkb3V0Py5vbihcImRhdGFcIiwgZGlzcGF0Y2gpO1xuICAgICAgcHJvY1xuICAgICAgICAub24oXCJtZXNzYWdlXCIsIGRpc3BhdGNoKVxuICAgICAgICAub24oXCJlcnJvclwiLCAoZXJyKSA9PiB7XG4gICAgICAgICAgZmF0YWwgKz0gZXJyLm1lc3NhZ2U7XG4gICAgICAgICAgcHJvYy5raWxsKCk7XG4gICAgICAgIH0pXG4gICAgICAgIC5vbmNlKFwiY2xvc2VcIiwgKGNvZGUsIHNpZ25hbCkgPT4ge1xuICAgICAgICAgIGlmIChjb2RlIHx8IHNpZ25hbCB8fCBmYXRhbCkge1xuICAgICAgICAgICAgZmF0YWwgfHw9IGBjb21tYW5kIGZhaWxlZDogJHtwcm9jLnNwYXduYXJncy5qb2luKFwiIFwiKX1gO1xuICAgICAgICAgICAgdGhpcy5kZWJ1ZyhgJHtuYW1lfS5jbG9zZWAsIHsgY29kZSwgc2lnbmFsLCBmYXRhbCB9KTtcbiAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoZmF0YWwpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5kZWJ1ZyhgJHtuYW1lfS5jbG9zZWApO1xuICAgICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICAgLm9uKFwidW5oYW5kbGVkUmVqZWN0aW9uXCIsIChyZWFzb24pID0+IHtcbiAgICAgICAgICB0aGlzLmVycm9yKGAke25hbWV9LnVuaGFuZGxlZGAsIHJlYXNvbik7XG4gICAgICAgIH0pXG4gICAgICAgIC5vbihcInVuY2F1Z2h0RXhjZXB0aW9uTW9uaXRvclwiLCAoZXJyKSA9PiB7XG4gICAgICAgICAgdGhpcy5lcnJvcihgJHtuYW1lfS51bmhhbmRsZWRgLCBlcnIpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgfVxufVxuXG5jb25zdCBsb2dnZXIgPSBuZXcgTG9nZ2VyKCk7XG5cbmV4cG9ydCB7IGxvZ2dlciB9O1xuIiwiLy8gQ3JlYXRlZCBieSBBdXRva2FrYSAocXExOTA5Njk4NDk0QGdtYWlsLmNvbSkgb24gMjAyNi8wMi8yNC5cblxuZXhwb3J0IGZ1bmN0aW9uIG5vZXJyPEZuIGV4dGVuZHMgKC4uLmFyZ3M6IGFueVtdKSA9PiBhbnksIEQ+KFxuICBmbjogRm4sXG4gIGRlZmF1bHRWYWx1ZTogRCxcbik6ICguLi5hcmdzOiBQYXJhbWV0ZXJzPEZuPikgPT4gUmV0dXJuVHlwZTxGbj4gfCBEIHtcbiAgcmV0dXJuICguLi5hcmdzKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJldCA9IGZuKC4uLmFyZ3MpO1xuICAgICAgaWYgKHJldCBpbnN0YW5jZW9mIFByb21pc2UpIHtcbiAgICAgICAgcmV0dXJuIHJldC5jYXRjaCgoKSA9PiBkZWZhdWx0VmFsdWUpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJldDtcbiAgICB9IGNhdGNoIHtcbiAgICAgIHJldHVybiBkZWZhdWx0VmFsdWU7XG4gICAgfVxuICB9O1xufVxuIiwiLy8gQ3JlYXRlZCBieSBBdXRva2FrYSAocXExOTA5Njk4NDk0QGdtYWlsLmNvbSkgb24gMjAyNi8wMS8zMC5cblxuaW1wb3J0IHsgc3Bhd24sIHR5cGUgQ2hpbGRQcm9jZXNzLCB0eXBlIFNwYXduT3B0aW9ucyB9IGZyb20gXCJjaGlsZF9wcm9jZXNzXCI7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tIFwiLi9sb2dnaW5nXCI7XG5cbmV4cG9ydCBjb25zdCBQVVBfQVJHU19LRVkgPSBcIi0tcHVwLXByaXYtYXJnc1wiO1xuXG5leHBvcnQgZnVuY3Rpb24gcGFyZ3MoKSB7XG4gIGNvbnN0IGFyZ3YgPSBwcm9jZXNzLmFyZ3Y7XG4gIGxldCBwcml2ID0gYXJndi5maW5kKChhcmcpID0+IGFyZy5zdGFydHNXaXRoKFBVUF9BUkdTX0tFWSkpO1xuICBpZiAoIXByaXYpIHtcbiAgICBsb2dnZXIuZGVidWcoXCJwcm9jYXJndlwiLCBhcmd2KTtcbiAgICByZXR1cm4gcHJvY2Vzcy5hcmd2O1xuICB9XG4gIGNvbnN0IGFyZ3MgPSBbXCJleGVjXCIsIC4uLmFyZ3Yuc2xpY2UoLTEpXTtcbiAgcHJpdiA9IEJ1ZmZlci5mcm9tKHByaXYuc3BsaXQoXCI9XCIpWzFdISwgXCJiYXNlNjRcIikudG9TdHJpbmcoKTtcbiAgYXJncy5wdXNoKC4uLkpTT04ucGFyc2UocHJpdikpO1xuICBsb2dnZXIuZGVidWcoXCJwdXBhcmdzXCIsIGFyZ3MpO1xuICByZXR1cm4gYXJncztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQcm9jZXNzSGFuZGxlIHtcbiAgcHJvY2VzczogQ2hpbGRQcm9jZXNzO1xuICB3YWl0OiBQcm9taXNlPHZvaWQ+O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZXhlYyhjbWQ6IHN0cmluZywgb3B0aW9ucz86IFNwYXduT3B0aW9ucyk6IFByb2Nlc3NIYW5kbGUge1xuICBjb25zdCBwYXJ0cyA9IGNtZC5zcGxpdChcIiBcIikuZmlsdGVyKChzKSA9PiBzLmxlbmd0aCk7XG4gIGNvbnN0IFtjb21tYW5kLCAuLi5hcmdzXSA9IHBhcnRzO1xuICBpZiAoIWNvbW1hbmQpIHRocm93IG5ldyBFcnJvcihcImVtcHR5IGNvbW1hbmRcIik7XG4gIGNvbnN0IHByb2MgPSBzcGF3bihjb21tYW5kLCBhcmdzLCB7XG4gICAgc3RkaW86IFwiaW5oZXJpdFwiLFxuICAgIC4uLm9wdGlvbnMsXG4gIH0pO1xuICByZXR1cm4geyBwcm9jZXNzOiBwcm9jLCB3YWl0OiBsb2dnZXIuYXR0YWNoKHByb2MsIGNvbW1hbmQpIH07XG59XG4iLCIvLyBDcmVhdGVkIGJ5IEF1dG9rYWthIChxcTE5MDk2OTg0OTRAZ21haWwuY29tKSBvbiAyMDI2LzAyLzA2LlxuXG5pbXBvcnQgeiBmcm9tIFwiem9kXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVmlkZW9GaWxlcyB7XG4gIGNvdmVyOiBzdHJpbmc7XG4gIG1wND86IHN0cmluZztcbiAgd2VibT86IHN0cmluZztcbn1cblxuZXhwb3J0IGNvbnN0IERFRkFVTFRfV0lEVEggPSAxOTIwO1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfSEVJR0hUID0gMTA4MDtcbmV4cG9ydCBjb25zdCBERUZBVUxUX0ZQUyA9IDMwO1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfRFVSQVRJT04gPSA1O1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfT1VUX0RJUiA9IFwib3V0XCI7XG5leHBvcnQgY29uc3QgVklERU9fRk9STUFUUyA9IFtcIm1wNFwiLCBcIndlYm1cIl0gYXMgY29uc3Q7XG5cbmV4cG9ydCB0eXBlIFZpZGVvRm9ybWF0ID0gKHR5cGVvZiBWSURFT19GT1JNQVRTKVtudW1iZXJdO1xuXG5leHBvcnQgZnVuY3Rpb24gaXNWaWRlb0Zvcm1hdChzOiBzdHJpbmcpOiBzIGlzIFZpZGVvRm9ybWF0IHtcbiAgcmV0dXJuIFZJREVPX0ZPUk1BVFMuaW5jbHVkZXMocyBhcyBWaWRlb0Zvcm1hdCk7XG59XG5cbmV4cG9ydCBjb25zdCBSZW5kZXJTY2hlbWEgPSB6Lm9iamVjdCh7XG4gIGR1cmF0aW9uOiB6Lm51bWJlcigpLm9wdGlvbmFsKCkuZGVmYXVsdChERUZBVUxUX0RVUkFUSU9OKS5kZXNjcmliZShcIkR1cmF0aW9uIGluIHNlY29uZHNcIiksXG4gIHdpZHRoOiB6Lm51bWJlcigpLm9wdGlvbmFsKCkuZGVmYXVsdChERUZBVUxUX1dJRFRIKS5kZXNjcmliZShcIlZpZGVvIHdpZHRoXCIpLFxuICBoZWlnaHQ6IHoubnVtYmVyKCkub3B0aW9uYWwoKS5kZWZhdWx0KERFRkFVTFRfSEVJR0hUKS5kZXNjcmliZShcIlZpZGVvIGhlaWdodFwiKSxcbiAgZnBzOiB6Lm51bWJlcigpLm9wdGlvbmFsKCkuZGVmYXVsdChERUZBVUxUX0ZQUykuZGVzY3JpYmUoXCJGcmFtZXMgcGVyIHNlY29uZFwiKSxcbiAgZm9ybWF0czogelxuICAgIC5hcnJheSh6LmVudW0oVklERU9fRk9STUFUUykpXG4gICAgLm9wdGlvbmFsKClcbiAgICAuZGVmYXVsdChbXCJtcDRcIl0pXG4gICAgLmRlc2NyaWJlKGBPdXRwdXQgdmlkZW8gZm9ybWF0cywgYWxsb3cgJHtWSURFT19GT1JNQVRTLmpvaW4oXCIsIFwiKX1gKSxcbiAgd2l0aEF1ZGlvOiB6LmJvb2xlYW4oKS5vcHRpb25hbCgpLmRlZmF1bHQoZmFsc2UpLmRlc2NyaWJlKFwiQ2FwdHVyZSBhbmQgZW5jb2RlIGF1ZGlvXCIpLFxuICBvdXREaXI6IHouc3RyaW5nKCkub3B0aW9uYWwoKS5kZWZhdWx0KERFRkFVTFRfT1VUX0RJUikuZGVzY3JpYmUoXCJPdXRwdXQgZGlyZWN0b3J5XCIpLFxuICB1c2VJbm5lclByb3h5OiB6LmJvb2xlYW4oKS5vcHRpb25hbCgpLmRlZmF1bHQoZmFsc2UpLmRlc2NyaWJlKFwiVXNlIGJpbGliaWxpIGlubmVyIHByb3h5IGZvciByZXNvdXJjZSBhY2Nlc3NcIiksXG4gIGRldGVybWluaXN0aWM6IHouYm9vbGVhbigpLm9wdGlvbmFsKCkuZGVmYXVsdChmYWxzZSkuZGVzY3JpYmUoXCJSZW5kZXIgYnkgZnJhbWUgcmF0aGVyIHRoYW4gcmVjb3JkaW5nXCIpLFxufSk7XG5cbmV4cG9ydCB0eXBlIFJlbmRlck9wdGlvbnMgPSB6LmluZmVyPHR5cGVvZiBSZW5kZXJTY2hlbWE+O1xuXG5leHBvcnQgaW50ZXJmYWNlIFJlbmRlclJlc3VsdCB7XG4gIG9wdGlvbnM6IFJlbmRlck9wdGlvbnM7XG4gIHdyaXR0ZW46IG51bWJlcjtcbiAgZmlsZXM6IFZpZGVvRmlsZXM7XG59XG4iLCIvLyBDcmVhdGVkIGJ5IEF1dG9rYWthIChxcTE5MDk2OTg0OTRAZ21haWwuY29tKSBvbiAyMDI2LzAyLzA5LlxuXG5pbXBvcnQgeyBwcm9ncmFtIH0gZnJvbSBcImNvbW1hbmRlclwiO1xuaW1wb3J0IHsgcHVwVXNlSW5uZXJQcm94eSB9IGZyb20gXCIuL2Jhc2UvY29uc3RhbnRzXCI7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tIFwiLi9iYXNlL2xvZ2dpbmdcIjtcbmltcG9ydCB7IG5vZXJyIH0gZnJvbSBcIi4vYmFzZS9ub2VyclwiO1xuaW1wb3J0IHsgcGFyc2VOdW1iZXIsIHBhcnNlU3RyaW5nIH0gZnJvbSBcIi4vYmFzZS9wYXJzZXJcIjtcbmltcG9ydCB7IHBhcmdzIH0gZnJvbSBcIi4vYmFzZS9wcm9jZXNzXCI7XG5pbXBvcnQge1xuICBERUZBVUxUX0RVUkFUSU9OLFxuICBERUZBVUxUX0ZQUyxcbiAgREVGQVVMVF9IRUlHSFQsXG4gIERFRkFVTFRfT1VUX0RJUixcbiAgREVGQVVMVF9XSURUSCxcbiAgaXNWaWRlb0Zvcm1hdCxcbiAgUmVuZGVyU2NoZW1hLFxuICB0eXBlIFJlbmRlck9wdGlvbnMsXG59IGZyb20gXCIuL3JlbmRlcmVyL3NjaGVtYVwiO1xuXG5leHBvcnQgdHlwZSBDTElDYWxsYmFjayA9IChzb3VyY2U6IHN0cmluZywgb3B0aW9uczogUmVuZGVyT3B0aW9ucykgPT4gUHJvbWlzZTx1bmtub3duPjtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG1ha2VDTEkobmFtZTogc3RyaW5nLCBjYWxsYmFjazogQ0xJQ2FsbGJhY2spIHtcbiAgY29uc3Qgc2hhcGUgPSBSZW5kZXJTY2hlbWEuc2hhcGU7XG4gIHByb2dyYW1cbiAgICAubmFtZShuYW1lKVxuICAgIC5hcmd1bWVudChcIjxzb3VyY2U+XCIsIFwiZmlsZTovLywgaHR0cChzKTovLywg5oiWIGRhdGE6IFVSSVwiKVxuICAgIC5vcHRpb24oXCItVywgLS13aWR0aCA8bnVtYmVyPlwiLCBzaGFwZS53aWR0aC5kZXNjcmlwdGlvbiwgYCR7REVGQVVMVF9XSURUSH1gKVxuICAgIC5vcHRpb24oXCItSCwgLS1oZWlnaHQgPG51bWJlcj5cIiwgc2hhcGUuaGVpZ2h0LmRlc2NyaXB0aW9uLCBgJHtERUZBVUxUX0hFSUdIVH1gKVxuICAgIC5vcHRpb24oXCItZiwgLS1mcHMgPG51bWJlcj5cIiwgc2hhcGUuZnBzLmRlc2NyaXB0aW9uLCBgJHtERUZBVUxUX0ZQU31gKVxuICAgIC5vcHRpb24oXCItdCwgLS1kdXJhdGlvbiA8bnVtYmVyPlwiLCBzaGFwZS5kdXJhdGlvbi5kZXNjcmlwdGlvbiwgYCR7REVGQVVMVF9EVVJBVElPTn1gKVxuICAgIC5vcHRpb24oXCItbywgLS1vdXQtZGlyIDxwYXRoPlwiLCBzaGFwZS5vdXREaXIuZGVzY3JpcHRpb24sIGAke0RFRkFVTFRfT1VUX0RJUn1gKVxuICAgIC5vcHRpb24oXCItRiwgLS1mb3JtYXRzIDxmb3JtYXRzPlwiLCBzaGFwZS5mb3JtYXRzLmRlc2NyaXB0aW9uLCBcIm1wNFwiKVxuICAgIC5vcHRpb24oXCItYSwgLS13aXRoLWF1ZGlvXCIsIHNoYXBlLndpdGhBdWRpby5kZXNjcmlwdGlvbiwgZmFsc2UpXG4gICAgLm9wdGlvbihcIi0tdXNlLWlubmVyLXByb3h5XCIsIHNoYXBlLnVzZUlubmVyUHJveHkuZGVzY3JpcHRpb24sIHB1cFVzZUlubmVyUHJveHkpXG4gICAgLm9wdGlvbihcIi1kLCAtLWRldGVybWluaXN0aWNcIiwgc2hhcGUuZGV0ZXJtaW5pc3RpYy5kZXNjcmlwdGlvbiwgZmFsc2UpXG4gICAgLmFjdGlvbihhc3luYyAoc291cmNlOiBzdHJpbmcsIG9wdHMpID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGNhbGxiYWNrKHNvdXJjZSwge1xuICAgICAgICAgIHdpZHRoOiBub2VycihwYXJzZU51bWJlciwgREVGQVVMVF9XSURUSCkob3B0cy53aWR0aCksXG4gICAgICAgICAgaGVpZ2h0OiBub2VycihwYXJzZU51bWJlciwgREVGQVVMVF9IRUlHSFQpKG9wdHMuaGVpZ2h0KSxcbiAgICAgICAgICBmcHM6IG5vZXJyKHBhcnNlTnVtYmVyLCBERUZBVUxUX0ZQUykob3B0cy5mcHMpLFxuICAgICAgICAgIGR1cmF0aW9uOiBub2VycihwYXJzZU51bWJlciwgREVGQVVMVF9EVVJBVElPTikob3B0cy5kdXJhdGlvbiksXG4gICAgICAgICAgb3V0RGlyOiBvcHRzLm91dERpciA/PyBERUZBVUxUX09VVF9ESVIsXG4gICAgICAgICAgZm9ybWF0czogcGFyc2VTdHJpbmcob3B0cy5mb3JtYXRzKVxuICAgICAgICAgICAgLnNwbGl0KFwiLFwiKVxuICAgICAgICAgICAgLm1hcCgocykgPT4gcy50cmltKCkpXG4gICAgICAgICAgICAuZmlsdGVyKGlzVmlkZW9Gb3JtYXQpLFxuICAgICAgICAgIHdpdGhBdWRpbzogb3B0cy53aXRoQXVkaW8gPz8gZmFsc2UsXG4gICAgICAgICAgdXNlSW5uZXJQcm94eTogb3B0cy51c2VJbm5lclByb3h5ID8/IHB1cFVzZUlubmVyUHJveHksXG4gICAgICAgICAgZGV0ZXJtaW5pc3RpYzogb3B0cy5kZXRlcm1pbmlzdGljID8/IGZhbHNlLFxuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgbG9nZ2VyLmZhdGFsKGUpO1xuICAgICAgfVxuICAgIH0pO1xuICBhd2FpdCBwcm9ncmFtLnBhcnNlQXN5bmMocGFyZ3MoKSk7XG59XG4iLCIvLyBDcmVhdGVkIGJ5IEF1dG9rYWthIChxcTE5MDk2OTg0OTRAZ21haWwuY29tKSBvbiAyMDI2LzAxLzMwLlxuXG5leHBvcnQgY2xhc3MgQ29uY3VycmVuY3lMaW1pdGVyIHtcbiAgcHJpdmF0ZSBfYWN0aXZlID0gMDtcbiAgcHJpdmF0ZSBfcXVldWU6IFZvaWRGdW5jdGlvbltdID0gW107XG4gIHByaXZhdGUgX2VuZGVkID0gZmFsc2U7XG5cbiAgY29uc3RydWN0b3IocmVhZG9ubHkgbWF4Q29uY3VycmVuY3k6IG51bWJlcikge31cblxuICBnZXQgYWN0aXZlKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX2FjdGl2ZTtcbiAgfVxuXG4gIGdldCBwZW5kaW5nKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuX3F1ZXVlLmxlbmd0aDtcbiAgfVxuXG4gIGdldCBzdGF0cygpOiBzdHJpbmcge1xuICAgIHJldHVybiBgYWN0aXZlOiAke3RoaXMuYWN0aXZlfSwgcGVuZGluZzogJHt0aGlzLnBlbmRpbmd9YDtcbiAgfVxuXG4gIGFzeW5jIHNjaGVkdWxlPFQ+KGZuOiAoKSA9PiBQcm9taXNlPFQ+KTogUHJvbWlzZTxUPiB7XG4gICAgaWYgKHRoaXMuX2VuZGVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJlbmRlZFwiKTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPFQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGNvbnN0IHJ1biA9ICgpID0+IHtcbiAgICAgICAgdGhpcy5fYWN0aXZlKys7XG4gICAgICAgIGZuKClcbiAgICAgICAgICAudGhlbigodikgPT4ge1xuICAgICAgICAgICAgdGhpcy5fYWN0aXZlLS07XG4gICAgICAgICAgICByZXNvbHZlKHYpO1xuICAgICAgICAgICAgdGhpcy5uZXh0KCk7XG4gICAgICAgICAgfSlcbiAgICAgICAgICAuY2F0Y2goKGUpID0+IHtcbiAgICAgICAgICAgIHRoaXMuX2FjdGl2ZS0tO1xuICAgICAgICAgICAgcmVqZWN0KGUpO1xuICAgICAgICAgICAgdGhpcy5uZXh0KCk7XG4gICAgICAgICAgfSk7XG4gICAgICB9O1xuICAgICAgdGhpcy5fcXVldWUucHVzaChydW4pO1xuICAgICAgdGhpcy5uZXh0KCk7XG4gICAgfSk7XG4gIH1cblxuICBhc3luYyBlbmQoKSB7XG4gICAgaWYgKHRoaXMuX2VuZGVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX2VuZGVkID0gdHJ1ZTtcbiAgICB3aGlsZSAodGhpcy5fYWN0aXZlID4gMCB8fCB0aGlzLnBlbmRpbmcgPiAwKSB7XG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocikgPT4gc2V0VGltZW91dChyLCA1MCkpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgbmV4dCgpIHtcbiAgICBpZiAodGhpcy5fYWN0aXZlIDwgdGhpcy5tYXhDb25jdXJyZW5jeSkge1xuICAgICAgdGhpcy5fcXVldWUuc2hpZnQoKT8uKCk7XG4gICAgfVxuICB9XG59XG4iLCIvLyBDcmVhdGVkIGJ5IEF1dG9rYWthIChxcTE5MDk2OTg0OTRAZ21haWwuY29tKSBvbiAyMDI2LzAzLzIxLlxuXG5pbXBvcnQge1xuICBDb2RlYyxcbiAgQ29kZWNDb250ZXh0LFxuICBGRm1wZWdFcnJvcixcbiAgRmlsdGVyLFxuICBGaWx0ZXJHcmFwaCxcbiAgRmlsdGVySW5PdXQsXG4gIEZyYW1lLFxuICBQYWNrZXQsXG4gIFJhdGlvbmFsLFxuICB0eXBlIEZpbHRlckNvbnRleHQsXG59IGZyb20gXCJub2RlLWF2XCI7XG5pbXBvcnQge1xuICBBVl9DSEFOTkVMX0xBWU9VVF9TVEVSRU8sXG4gIEFWX0NPREVDX0ZMQUdfR0xPQkFMX0hFQURFUixcbiAgQVZfU0FNUExFX0ZNVF9GTFQsXG4gIEFWX1NBTVBMRV9GTVRfRkxUUCxcbiAgQVZFUlJPUl9FQUdBSU4sXG4gIEFWRVJST1JfRU9GLFxuICB0eXBlIEZGQXVkaW9FbmNvZGVyLFxufSBmcm9tIFwibm9kZS1hdi9jb25zdGFudHNcIjtcbmltcG9ydCB0eXBlIHsgRm9ybWF0TXV4ZXIgfSBmcm9tIFwiLi9tdXhlclwiO1xuXG5jb25zdCBTQU1QTEVfRk1UX05BTUU6IFJlY29yZDxudW1iZXIsIHN0cmluZz4gPSB7XG4gIFtBVl9TQU1QTEVfRk1UX0ZMVF06IFwiZmx0XCIsXG4gIFtBVl9TQU1QTEVfRk1UX0ZMVFBdOiBcImZsdHBcIixcbn07XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXVkaW9FbmNvZGVyT3B0aW9ucyB7XG4gIG91dFNhbXBsZVJhdGU6IG51bWJlcjtcbiAgb3V0U2FtcGxlRm10OiB0eXBlb2YgQVZfU0FNUExFX0ZNVF9GTFQgfCB0eXBlb2YgQVZfU0FNUExFX0ZNVF9GTFRQO1xuICBjb2RlY05hbWU6IEZGQXVkaW9FbmNvZGVyO1xuICBnbG9iYWxIZWFkZXI6IGJvb2xlYW47XG4gIGJpdHJhdGU6IG51bWJlcjtcbiAgbXV4ZXI6IEZvcm1hdE11eGVyO1xufVxuXG50eXBlIFN0cmVhbSA9IFJldHVyblR5cGU8aW1wb3J0KFwibm9kZS1hdlwiKS5Gb3JtYXRDb250ZXh0W1wibmV3U3RyZWFtXCJdPjtcblxuZXhwb3J0IGNsYXNzIEF1ZGlvRW5jb2RlciBpbXBsZW1lbnRzIERpc3Bvc2FibGUge1xuICBwcml2YXRlIHJlYWRvbmx5IF9jdHg6IENvZGVjQ29udGV4dDtcbiAgcHJpdmF0ZSByZWFkb25seSBfc3RyZWFtOiBTdHJlYW07XG4gIHByaXZhdGUgcmVhZG9ubHkgX291dFJhdGU6IG51bWJlcjtcbiAgcHJpdmF0ZSByZWFkb25seSBfb3V0Rm10OiB0eXBlb2YgQVZfU0FNUExFX0ZNVF9GTFQgfCB0eXBlb2YgQVZfU0FNUExFX0ZNVF9GTFRQO1xuICBwcml2YXRlIHJlYWRvbmx5IF9mcmFtZVNpemU6IG51bWJlcjtcbiAgcHJpdmF0ZSByZWFkb25seSBfcGt0OiBQYWNrZXQ7XG4gIHByaXZhdGUgcmVhZG9ubHkgX2ZpbHRlckZyYW1lOiBGcmFtZTtcblxuICBwcml2YXRlIF9ncmFwaD86IEZpbHRlckdyYXBoO1xuICBwcml2YXRlIF9idWZTcmM/OiBGaWx0ZXJDb250ZXh0O1xuICBwcml2YXRlIF9idWZTaW5rPzogRmlsdGVyQ29udGV4dDtcbiAgcHJpdmF0ZSBfaW5SYXRlPzogbnVtYmVyO1xuICBwdHMgPSAwbjtcblxuICBwcml2YXRlIGNvbnN0cnVjdG9yKGN0eDogQ29kZWNDb250ZXh0LCBzdHJlYW06IFN0cmVhbSwgb3V0Rm10OiB0eXBlb2YgQVZfU0FNUExFX0ZNVF9GTFQgfCB0eXBlb2YgQVZfU0FNUExFX0ZNVF9GTFRQKSB7XG4gICAgdGhpcy5fY3R4ID0gY3R4O1xuICAgIHRoaXMuX3N0cmVhbSA9IHN0cmVhbTtcbiAgICB0aGlzLl9vdXRSYXRlID0gY3R4LnNhbXBsZVJhdGU7XG4gICAgdGhpcy5fb3V0Rm10ID0gb3V0Rm10O1xuICAgIHRoaXMuX2ZyYW1lU2l6ZSA9IGN0eC5mcmFtZVNpemU7XG5cbiAgICB0aGlzLl9wa3QgPSBuZXcgUGFja2V0KCk7XG4gICAgdGhpcy5fcGt0LmFsbG9jKCk7XG5cbiAgICB0aGlzLl9maWx0ZXJGcmFtZSA9IG5ldyBGcmFtZSgpO1xuICAgIHRoaXMuX2ZpbHRlckZyYW1lLmFsbG9jKCk7XG4gIH1cblxuICBzdGF0aWMgYXN5bmMgY3JlYXRlKG9wdHM6IEF1ZGlvRW5jb2Rlck9wdGlvbnMpOiBQcm9taXNlPEF1ZGlvRW5jb2Rlcj4ge1xuICAgIGNvbnN0IHsgb3V0U2FtcGxlUmF0ZSwgb3V0U2FtcGxlRm10LCBjb2RlY05hbWUsIGdsb2JhbEhlYWRlciwgYml0cmF0ZSwgbXV4ZXIgfSA9IG9wdHM7XG5cbiAgICBjb25zdCBjb2RlYyA9IENvZGVjLmZpbmRFbmNvZGVyQnlOYW1lKGNvZGVjTmFtZSk7XG4gICAgaWYgKCFjb2RlYykgdGhyb3cgbmV3IEVycm9yKGBBdWRpbyBlbmNvZGVyIG5vdCBmb3VuZDogJHtjb2RlY05hbWV9YCk7XG5cbiAgICBjb25zdCBjdHggPSBuZXcgQ29kZWNDb250ZXh0KCk7XG4gICAgY3R4LmFsbG9jQ29udGV4dDMoY29kZWMpO1xuICAgIGN0eC5jb2RlY0lkID0gY29kZWMuaWQ7XG4gICAgY3R4LnNhbXBsZUZvcm1hdCA9IG91dFNhbXBsZUZtdDtcbiAgICBjdHguc2FtcGxlUmF0ZSA9IG91dFNhbXBsZVJhdGU7XG4gICAgY3R4LmNoYW5uZWxMYXlvdXQgPSBBVl9DSEFOTkVMX0xBWU9VVF9TVEVSRU87XG4gICAgY3R4LnRpbWVCYXNlID0gbmV3IFJhdGlvbmFsKDEsIG91dFNhbXBsZVJhdGUpO1xuICAgIGN0eC5iaXRSYXRlID0gQmlnSW50KGJpdHJhdGUpO1xuICAgIGlmIChnbG9iYWxIZWFkZXIpIGN0eC5zZXRGbGFncyhBVl9DT0RFQ19GTEFHX0dMT0JBTF9IRUFERVIpO1xuICAgIEZGbXBlZ0Vycm9yLnRocm93SWZFcnJvcihhd2FpdCBjdHgub3BlbjIoY29kZWMsIG51bGwpLCBcImF1ZGlvQ3R4Lm9wZW4yXCIpO1xuXG4gICAgY29uc3Qgc3RyZWFtID0gbXV4ZXIuYWRkU3RyZWFtKGN0eCk7XG4gICAgcmV0dXJuIG5ldyBBdWRpb0VuY29kZXIoY3R4LCBzdHJlYW0sIG91dFNhbXBsZUZtdCk7XG4gIH1cblxuICAvKiogQ2FsbGVkIG9uY2Ugd2hlbiBhdWRpby1tZXRhIGFycml2ZXMgd2l0aCB0aGUgcGFnZSdzIGFjdHVhbCBzYW1wbGUgcmF0ZS4gKi9cbiAgc2V0SW5wdXRSYXRlKGluU2FtcGxlUmF0ZTogbnVtYmVyKTogdm9pZCB7XG4gICAgdGhpcy5fZGlzcG9zZUdyYXBoKCk7XG4gICAgdGhpcy5faW5SYXRlID0gaW5TYW1wbGVSYXRlO1xuXG4gICAgY29uc3QgZ3JhcGggPSBuZXcgRmlsdGVyR3JhcGgoKTtcbiAgICBncmFwaC5hbGxvYygpO1xuXG4gICAgLy8gYWJ1ZmZlciBzb3VyY2U6IGludGVybGVhdmVkIHN0ZXJlbyBmbG9hdCBmcm9tIGJyb3dzZXJcbiAgICBjb25zdCBhYnVmZmVyID0gRmlsdGVyLmdldEJ5TmFtZShcImFidWZmZXJcIikhO1xuICAgIGNvbnN0IHNyY0FyZ3MgPSBgc2FtcGxlX3JhdGU9JHtpblNhbXBsZVJhdGV9OnNhbXBsZV9mbXQ9Zmx0OmNoYW5uZWxfbGF5b3V0PXN0ZXJlbzp0aW1lX2Jhc2U9MS8ke2luU2FtcGxlUmF0ZX1gO1xuICAgIGNvbnN0IGJ1ZlNyYyA9IGdyYXBoLmNyZWF0ZUZpbHRlcihhYnVmZmVyLCBcInNyY1wiLCBzcmNBcmdzKTtcbiAgICBpZiAoIWJ1ZlNyYykgdGhyb3cgbmV3IEVycm9yKFwiRmFpbGVkIHRvIGNyZWF0ZSBhYnVmZmVyXCIpO1xuXG4gICAgLy8gYWJ1ZmZlcnNpbmtcbiAgICBjb25zdCBhYnVmZmVyc2luayA9IEZpbHRlci5nZXRCeU5hbWUoXCJhYnVmZmVyc2lua1wiKSE7XG4gICAgY29uc3QgYnVmU2luayA9IGdyYXBoLmNyZWF0ZUZpbHRlcihhYnVmZmVyc2luaywgXCJzaW5rXCIpO1xuICAgIGlmICghYnVmU2luaykgdGhyb3cgbmV3IEVycm9yKFwiRmFpbGVkIHRvIGNyZWF0ZSBhYnVmZmVyc2lua1wiKTtcblxuICAgIC8vIFBhcnNlIGZpbHRlciBjaGFpbjogYWZvcm1hdCArIGFzZXRuc2FtcGxlc1xuICAgIGNvbnN0IGZtdE5hbWUgPSBTQU1QTEVfRk1UX05BTUVbdGhpcy5fb3V0Rm10XSA/PyBcImZsdFwiO1xuICAgIGNvbnN0IGZpbHRlckRlc2MgPSBgYWZvcm1hdD1zYW1wbGVfZm10cz0ke2ZtdE5hbWV9OnNhbXBsZV9yYXRlcz0ke3RoaXMuX291dFJhdGV9OmNoYW5uZWxfbGF5b3V0cz1zdGVyZW8sYXNldG5zYW1wbGVzPW49JHt0aGlzLl9mcmFtZVNpemV9OnA9MWA7XG5cbiAgICBjb25zdCBvdXRwdXRzID0gRmlsdGVySW5PdXQuY3JlYXRlTGlzdChbeyBuYW1lOiBcImluXCIsIGZpbHRlckN0eDogYnVmU3JjLCBwYWRJZHg6IDAgfV0pO1xuICAgIGNvbnN0IGlucHV0cyA9IEZpbHRlckluT3V0LmNyZWF0ZUxpc3QoW3sgbmFtZTogXCJvdXRcIiwgZmlsdGVyQ3R4OiBidWZTaW5rLCBwYWRJZHg6IDAgfV0pO1xuICAgIEZGbXBlZ0Vycm9yLnRocm93SWZFcnJvcihncmFwaC5wYXJzZVB0cihmaWx0ZXJEZXNjLCBpbnB1dHMsIG91dHB1dHMpLCBcImdyYXBoLnBhcnNlUHRyXCIpO1xuICAgIEZGbXBlZ0Vycm9yLnRocm93SWZFcnJvcihncmFwaC5jb25maWdTeW5jKCksIFwiZ3JhcGguY29uZmlnXCIpO1xuXG4gICAgdGhpcy5fZ3JhcGggPSBncmFwaDtcbiAgICB0aGlzLl9idWZTcmMgPSBidWZTcmM7XG4gICAgdGhpcy5fYnVmU2luayA9IGJ1ZlNpbms7XG4gIH1cblxuICBnZXQgc3RyZWFtKCkge1xuICAgIHJldHVybiB0aGlzLl9zdHJlYW07XG4gIH1cbiAgZ2V0IHRpbWVCYXNlKCkge1xuICAgIHJldHVybiB0aGlzLl9jdHgudGltZUJhc2U7XG4gIH1cblxuICBhc3luYyBlbmNvZGUocGNtOiBCdWZmZXIsIG11eGVyOiBGb3JtYXRNdXhlcik6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICghdGhpcy5fYnVmU3JjIHx8ICF0aGlzLl9idWZTaW5rIHx8ICF0aGlzLl9pblJhdGUpIHJldHVybjtcblxuICAgIC8vIEluLXBsYWNlIHNhbml0aXplIOKAlCBtdXRhdGUgc291cmNlIGRpcmVjdGx5LCBubyBjb3B5XG4gICAgY29uc3Qgc3JjID0gbmV3IEZsb2F0MzJBcnJheShwY20uYnVmZmVyLCBwY20uYnl0ZU9mZnNldCwgcGNtLmJ5dGVMZW5ndGggLyA0KTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNyYy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKCFpc0Zpbml0ZShzcmNbaV0hKSkgc3JjW2ldID0gMDtcbiAgICB9XG4gICAgY29uc3QgblNhbXBsZXMgPSBzcmMubGVuZ3RoID4+IDE7XG5cbiAgICB1c2luZyBmcmFtZSA9IEZyYW1lLmZyb21BdWRpb0J1ZmZlcihCdWZmZXIuZnJvbShzcmMuYnVmZmVyLCBzcmMuYnl0ZU9mZnNldCwgc3JjLmJ5dGVMZW5ndGgpLCB7XG4gICAgICBuYlNhbXBsZXM6IG5TYW1wbGVzLFxuICAgICAgZm9ybWF0OiBBVl9TQU1QTEVfRk1UX0ZMVCxcbiAgICAgIHNhbXBsZVJhdGU6IHRoaXMuX2luUmF0ZSxcbiAgICAgIGNoYW5uZWxMYXlvdXQ6IEFWX0NIQU5ORUxfTEFZT1VUX1NURVJFTyxcbiAgICAgIHB0czogdGhpcy5wdHMsXG4gICAgICB0aW1lQmFzZTogeyBudW06IDEsIGRlbjogdGhpcy5faW5SYXRlIH0sXG4gICAgfSk7XG4gICAgdGhpcy5wdHMgKz0gQmlnSW50KG5TYW1wbGVzKTtcblxuICAgIEZGbXBlZ0Vycm9yLnRocm93SWZFcnJvcihhd2FpdCB0aGlzLl9idWZTcmMuYnVmZmVyc3JjQWRkRnJhbWUoZnJhbWUpLCBcImJ1ZmZlcnNyY0FkZEZyYW1lXCIpO1xuICAgIGF3YWl0IHRoaXMuX2RyYWluRmlsdGVyKG11eGVyKTtcbiAgfVxuXG4gIGFzeW5jIGZsdXNoKG11eGVyOiBGb3JtYXRNdXhlcik6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICh0aGlzLl9idWZTcmMgJiYgdGhpcy5fYnVmU2luaykge1xuICAgICAgLy8gU2lnbmFsIEVPRiB0byBmaWx0ZXIgZ3JhcGhcbiAgICAgIGF3YWl0IHRoaXMuX2J1ZlNyYy5idWZmZXJzcmNBZGRGcmFtZShudWxsKTtcbiAgICAgIGF3YWl0IHRoaXMuX2RyYWluRmlsdGVyKG11eGVyKTtcbiAgICB9XG4gICAgLy8gRmx1c2ggY29kZWNcbiAgICBhd2FpdCB0aGlzLl9jdHguc2VuZEZyYW1lKG51bGwpO1xuICAgIGF3YWl0IHRoaXMuX2RyYWluQ29kZWMobXV4ZXIpO1xuICB9XG5cbiAgW1N5bWJvbC5kaXNwb3NlXSgpOiB2b2lkIHtcbiAgICB0aGlzLl9wa3QuZnJlZSgpO1xuICAgIHRoaXMuX2ZpbHRlckZyYW1lLmZyZWUoKTtcbiAgICB0aGlzLl9kaXNwb3NlR3JhcGgoKTtcbiAgICB0aGlzLl9jdHguZnJlZUNvbnRleHQoKTtcbiAgfVxuXG4gIC8qKiBEcmFpbiBmaWx0ZXIg4oaSIHNlbmQgdG8gY29kZWMg4oaSIGRyYWluIGNvZGVjIHBhY2tldHMuICovXG4gIHByaXZhdGUgYXN5bmMgX2RyYWluRmlsdGVyKG11eGVyOiBGb3JtYXRNdXhlcik6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnN0IG91dEZyYW1lID0gdGhpcy5fZmlsdGVyRnJhbWU7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGNvbnN0IHIgPSBhd2FpdCB0aGlzLl9idWZTaW5rIS5idWZmZXJzaW5rR2V0RnJhbWUob3V0RnJhbWUpO1xuICAgICAgaWYgKHIgPT09IEFWRVJST1JfRUFHQUlOIHx8IHIgPT09IEFWRVJST1JfRU9GKSBicmVhaztcbiAgICAgIEZGbXBlZ0Vycm9yLnRocm93SWZFcnJvcihyLCBcImJ1ZmZlcnNpbmtHZXRGcmFtZVwiKTtcbiAgICAgIEZGbXBlZ0Vycm9yLnRocm93SWZFcnJvcihhd2FpdCB0aGlzLl9jdHguc2VuZEZyYW1lKG91dEZyYW1lKSwgXCJhdWRpb0N0eC5zZW5kRnJhbWVcIik7XG4gICAgICBvdXRGcmFtZS51bnJlZigpO1xuICAgICAgYXdhaXQgdGhpcy5fZHJhaW5Db2RlYyhtdXhlcik7XG4gICAgfVxuICB9XG5cbiAgLyoqIERyYWluIGNvZGVjIHBhY2tldHMgdG8gbXV4ZXIuICovXG4gIHByaXZhdGUgYXN5bmMgX2RyYWluQ29kZWMobXV4ZXI6IEZvcm1hdE11eGVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgcGt0ID0gdGhpcy5fcGt0O1xuICAgIHdoaWxlICh0cnVlKSB7XG4gICAgICBjb25zdCByID0gYXdhaXQgdGhpcy5fY3R4LnJlY2VpdmVQYWNrZXQocGt0KTtcbiAgICAgIGlmIChyID09PSBBVkVSUk9SX0VBR0FJTiB8fCByID09PSBBVkVSUk9SX0VPRikgYnJlYWs7XG4gICAgICBGRm1wZWdFcnJvci50aHJvd0lmRXJyb3IociwgXCJhdWRpby5yZWNlaXZlUGFja2V0XCIpO1xuICAgICAgcGt0LnN0cmVhbUluZGV4ID0gdGhpcy5fc3RyZWFtLmluZGV4O1xuICAgICAgcGt0LnJlc2NhbGVUcyh0aGlzLl9jdHgudGltZUJhc2UsIHRoaXMuX3N0cmVhbS50aW1lQmFzZSk7XG4gICAgICBhd2FpdCBtdXhlci53cml0ZVBhY2tldChwa3QpO1xuICAgICAgcGt0LnVucmVmKCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBfZGlzcG9zZUdyYXBoKCk6IHZvaWQge1xuICAgIC8vIEZpbHRlckdyYXBoLmZyZWUoKSByZWxlYXNlcyBhbGwgY29udGFpbmVkIGZpbHRlciBjb250ZXh0c1xuICAgIHRoaXMuX2dyYXBoPy5bU3ltYm9sLmRpc3Bvc2VdKCk7XG4gICAgdGhpcy5fZ3JhcGggPSB1bmRlZmluZWQ7XG4gICAgdGhpcy5fYnVmU3JjID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX2J1ZlNpbmsgPSB1bmRlZmluZWQ7XG4gIH1cbn1cbiIsImltcG9ydCB7IENvZGVjQ29udGV4dCwgRkZtcGVnRXJyb3IsIEZvcm1hdENvbnRleHQsIFBhY2tldCB9IGZyb20gXCJub2RlLWF2XCI7XG5cbmV4cG9ydCBjbGFzcyBGb3JtYXRNdXhlciB7XG4gIHByaXZhdGUgcmVhZG9ubHkgX2N0eDogRm9ybWF0Q29udGV4dDtcbiAgcHJpdmF0ZSBfb3BlbmVkID0gZmFsc2U7XG5cbiAgY29uc3RydWN0b3Iob3V0UGF0aDogc3RyaW5nKSB7XG4gICAgdGhpcy5fY3R4ID0gbmV3IEZvcm1hdENvbnRleHQoKTtcbiAgICBGRm1wZWdFcnJvci50aHJvd0lmRXJyb3IodGhpcy5fY3R4LmFsbG9jT3V0cHV0Q29udGV4dDIobnVsbCwgbnVsbCwgb3V0UGF0aCksIFwiYWxsb2NPdXRwdXRDb250ZXh0MlwiKTtcbiAgfVxuXG4gIGFkZFN0cmVhbShjb2RlY0N0eDogQ29kZWNDb250ZXh0LCBjb2RlY1RhZz86IHN0cmluZyk6IFJldHVyblR5cGU8Rm9ybWF0Q29udGV4dFtcIm5ld1N0cmVhbVwiXT4ge1xuICAgIGNvbnN0IHN0cmVhbSA9IHRoaXMuX2N0eC5uZXdTdHJlYW0obnVsbCk7XG4gICAgc3RyZWFtLnRpbWVCYXNlID0gY29kZWNDdHgudGltZUJhc2U7XG4gICAgRkZtcGVnRXJyb3IudGhyb3dJZkVycm9yKHN0cmVhbS5jb2RlY3Bhci5mcm9tQ29udGV4dChjb2RlY0N0eCksIFwiY29kZWNwYXIuZnJvbUNvbnRleHRcIik7XG4gICAgaWYgKGNvZGVjVGFnKSBzdHJlYW0uY29kZWNwYXIuY29kZWNUYWcgPSBjb2RlY1RhZztcbiAgICByZXR1cm4gc3RyZWFtO1xuICB9XG5cbiAgYXN5bmMgb3BlbigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5fb3BlbmVkKSByZXR1cm47XG4gICAgRkZtcGVnRXJyb3IudGhyb3dJZkVycm9yKGF3YWl0IHRoaXMuX2N0eC5vcGVuT3V0cHV0KCksIFwib3Blbk91dHB1dFwiKTtcbiAgICBGRm1wZWdFcnJvci50aHJvd0lmRXJyb3IoYXdhaXQgdGhpcy5fY3R4LndyaXRlSGVhZGVyKG51bGwpLCBcIndyaXRlSGVhZGVyXCIpO1xuICAgIHRoaXMuX29wZW5lZCA9IHRydWU7XG4gIH1cblxuICBhc3luYyB3cml0ZVBhY2tldChwa3Q6IFBhY2tldCk6IFByb21pc2U8dm9pZD4ge1xuICAgIEZGbXBlZ0Vycm9yLnRocm93SWZFcnJvcihhd2FpdCB0aGlzLl9jdHguaW50ZXJsZWF2ZWRXcml0ZUZyYW1lKHBrdCksIFwiaW50ZXJsZWF2ZWRXcml0ZUZyYW1lXCIpO1xuICB9XG5cbiAgYXN5bmMgZmluaXNoKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICghdGhpcy5fb3BlbmVkKSByZXR1cm47XG4gICAgYXdhaXQgdGhpcy5fY3R4LndyaXRlVHJhaWxlcigpO1xuICAgIGF3YWl0IHRoaXMuX2N0eC5jbG9zZU91dHB1dCgpO1xuICAgIHRoaXMuX29wZW5lZCA9IGZhbHNlO1xuICB9XG5cbiAgYXN5bmMgW1N5bWJvbC5hc3luY0Rpc3Bvc2VdKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IHRoaXMuZmluaXNoKCk7XG4gICAgYXdhaXQgdGhpcy5fY3R4W1N5bWJvbC5hc3luY0Rpc3Bvc2VdKCk7XG4gIH1cbn1cbiIsIi8vIENyZWF0ZWQgYnkgQXV0b2tha2EgKHFxMTkwOTY5ODQ5NEBnbWFpbC5jb20pIG9uIDIwMjYvMDMvMjEuXG5cbmltcG9ydCB7IENvZGVjLCBDb2RlY0NvbnRleHQsIEZGbXBlZ0Vycm9yLCBGcmFtZSwgUGFja2V0LCBSYXRpb25hbCwgU29mdHdhcmVTY2FsZUNvbnRleHQgfSBmcm9tIFwibm9kZS1hdlwiO1xuaW1wb3J0IHtcbiAgQVZfQ09ERUNfRkxBR19HTE9CQUxfSEVBREVSLFxuICBBVl9QSVhfRk1UX0JHUkEsXG4gIEFWX1BJWF9GTVRfWVVWNDIwUCxcbiAgQVZfUElYX0ZNVF9ZVVZBNDIwUCxcbiAgQVZFUlJPUl9FQUdBSU4sXG4gIEFWRVJST1JfRU9GLFxuICBTV1NfQklMSU5FQVIsXG4gIHR5cGUgRkZWaWRlb0VuY29kZXIsXG59IGZyb20gXCJub2RlLWF2L2NvbnN0YW50c1wiO1xuaW1wb3J0IHR5cGUgeyBGb3JtYXRNdXhlciB9IGZyb20gXCIuL211eGVyXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgVmlkZW9FbmNvZGVyT3B0aW9ucyB7XG4gIHdpZHRoOiBudW1iZXI7XG4gIGhlaWdodDogbnVtYmVyO1xuICBmcHM6IG51bWJlcjtcbiAgY29kZWNOYW1lOiBGRlZpZGVvRW5jb2RlcjtcbiAgcGl4Rm10OiB0eXBlb2YgQVZfUElYX0ZNVF9ZVVZBNDIwUCB8IHR5cGVvZiBBVl9QSVhfRk1UX1lVVjQyMFA7XG4gIGNvZGVjVGFnPzogc3RyaW5nO1xuICBnbG9iYWxIZWFkZXI6IGJvb2xlYW47XG4gIGNvZGVjT3B0czogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcbiAgYml0cmF0ZTogbnVtYmVyO1xuICBtdXhlcjogRm9ybWF0TXV4ZXI7XG59XG5cbnR5cGUgU3RyZWFtID0gUmV0dXJuVHlwZTxpbXBvcnQoXCJub2RlLWF2XCIpLkZvcm1hdENvbnRleHRbXCJuZXdTdHJlYW1cIl0+O1xuXG5leHBvcnQgY2xhc3MgVmlkZW9FbmNvZGVyIGltcGxlbWVudHMgRGlzcG9zYWJsZSB7XG4gIHByaXZhdGUgcmVhZG9ubHkgX2N0eDogQ29kZWNDb250ZXh0O1xuICBwcml2YXRlIHJlYWRvbmx5IF9zd3M6IFNvZnR3YXJlU2NhbGVDb250ZXh0O1xuICBwcml2YXRlIHJlYWRvbmx5IF9zcmM6IEZyYW1lO1xuICBwcml2YXRlIHJlYWRvbmx5IF9kc3Q6IEZyYW1lO1xuICBwcml2YXRlIHJlYWRvbmx5IF9wa3Q6IFBhY2tldDtcbiAgcHJpdmF0ZSByZWFkb25seSBfc3RyZWFtOiBTdHJlYW07XG4gIHB0cyA9IDBuO1xuXG4gIHByaXZhdGUgY29uc3RydWN0b3IoXG4gICAgY3R4OiBDb2RlY0NvbnRleHQsXG4gICAgc3dzOiBTb2Z0d2FyZVNjYWxlQ29udGV4dCxcbiAgICBzcmM6IEZyYW1lLFxuICAgIGRzdDogRnJhbWUsXG4gICAgcGt0OiBQYWNrZXQsXG4gICAgc3RyZWFtOiBTdHJlYW0sXG4gICkge1xuICAgIHRoaXMuX2N0eCA9IGN0eDtcbiAgICB0aGlzLl9zd3MgPSBzd3M7XG4gICAgdGhpcy5fc3JjID0gc3JjO1xuICAgIHRoaXMuX2RzdCA9IGRzdDtcbiAgICB0aGlzLl9wa3QgPSBwa3Q7XG4gICAgdGhpcy5fc3RyZWFtID0gc3RyZWFtO1xuICB9XG5cbiAgc3RhdGljIGFzeW5jIGNyZWF0ZShvcHRzOiBWaWRlb0VuY29kZXJPcHRpb25zKTogUHJvbWlzZTxWaWRlb0VuY29kZXI+IHtcbiAgICBjb25zdCB7IHdpZHRoLCBoZWlnaHQsIGZwcywgY29kZWNOYW1lLCBwaXhGbXQsIGNvZGVjVGFnLCBnbG9iYWxIZWFkZXIsIGNvZGVjT3B0cywgYml0cmF0ZSwgbXV4ZXIgfSA9IG9wdHM7XG5cbiAgICBjb25zdCBjb2RlYyA9IENvZGVjLmZpbmRFbmNvZGVyQnlOYW1lKGNvZGVjTmFtZSk7XG4gICAgaWYgKCFjb2RlYykgdGhyb3cgbmV3IEVycm9yKGBWaWRlbyBlbmNvZGVyIG5vdCBmb3VuZDogJHtjb2RlY05hbWV9YCk7XG5cbiAgICBjb25zdCBjdHggPSBuZXcgQ29kZWNDb250ZXh0KCk7XG4gICAgY3R4LmFsbG9jQ29udGV4dDMoY29kZWMpO1xuICAgIGN0eC5jb2RlY0lkID0gY29kZWMuaWQ7XG4gICAgY3R4LndpZHRoID0gd2lkdGg7XG4gICAgY3R4LmhlaWdodCA9IGhlaWdodDtcbiAgICBjdHgucGl4ZWxGb3JtYXQgPSBwaXhGbXQ7XG4gICAgY3R4LnRpbWVCYXNlID0gbmV3IFJhdGlvbmFsKDEsIGZwcyk7XG4gICAgY3R4LmZyYW1lcmF0ZSA9IG5ldyBSYXRpb25hbChmcHMsIDEpO1xuICAgIGN0eC5nb3BTaXplID0gZnBzO1xuICAgIGN0eC5iaXRSYXRlID0gQmlnSW50KGJpdHJhdGUpO1xuICAgIGN0eC5zZXRPcHRpb24oXCJ0aHJlYWRzXCIsIFwiNFwiKTtcbiAgICBpZiAoZ2xvYmFsSGVhZGVyKSBjdHguc2V0RmxhZ3MoQVZfQ09ERUNfRkxBR19HTE9CQUxfSEVBREVSKTtcbiAgICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBPYmplY3QuZW50cmllcyhjb2RlY09wdHMpKSBjdHguc2V0T3B0aW9uKGssIHYpO1xuICAgIGlmIChjb2RlY1RhZykgY3R4LmNvZGVjVGFnID0gY29kZWNUYWc7XG4gICAgRkZtcGVnRXJyb3IudGhyb3dJZkVycm9yKGF3YWl0IGN0eC5vcGVuMihjb2RlYywgbnVsbCksIFwidmlkZW9DdHgub3BlbjJcIik7XG5cbiAgICBjb25zdCBzd3MgPSBuZXcgU29mdHdhcmVTY2FsZUNvbnRleHQoKTtcbiAgICBzd3MuZ2V0Q29udGV4dCh3aWR0aCwgaGVpZ2h0LCBBVl9QSVhfRk1UX0JHUkEsIHdpZHRoLCBoZWlnaHQsIHBpeEZtdCwgU1dTX0JJTElORUFSKTtcblxuICAgIGNvbnN0IGRzdCA9IG5ldyBGcmFtZSgpO1xuICAgIGRzdC5hbGxvYygpO1xuICAgIGRzdC5mb3JtYXQgPSBwaXhGbXQ7XG4gICAgZHN0LndpZHRoID0gd2lkdGg7XG4gICAgZHN0LmhlaWdodCA9IGhlaWdodDtcbiAgICBGRm1wZWdFcnJvci50aHJvd0lmRXJyb3IoZHN0LmdldEJ1ZmZlcigwKSwgXCJkc3RGcmFtZS5nZXRCdWZmZXJcIik7XG5cbiAgICAvLyBQcmUtYWxsb2NhdGUgc3JjIGZyYW1lIChCR1JBLCByZXVzZWQgZXZlcnkgZW5jb2RlKVxuICAgIGNvbnN0IHNyYyA9IG5ldyBGcmFtZSgpO1xuICAgIHNyYy5hbGxvYygpO1xuICAgIHNyYy5mb3JtYXQgPSBBVl9QSVhfRk1UX0JHUkE7XG4gICAgc3JjLndpZHRoID0gd2lkdGg7XG4gICAgc3JjLmhlaWdodCA9IGhlaWdodDtcbiAgICBGRm1wZWdFcnJvci50aHJvd0lmRXJyb3Ioc3JjLmdldEJ1ZmZlcigwKSwgXCJzcmNGcmFtZS5nZXRCdWZmZXJcIik7XG5cbiAgICAvLyBQcmUtYWxsb2NhdGUgcmV1c2FibGUgcGFja2V0XG4gICAgY29uc3QgcGt0ID0gbmV3IFBhY2tldCgpO1xuICAgIHBrdC5hbGxvYygpO1xuXG4gICAgY29uc3Qgc3RyZWFtID0gbXV4ZXIuYWRkU3RyZWFtKGN0eCwgY29kZWNUYWcpO1xuICAgIHJldHVybiBuZXcgVmlkZW9FbmNvZGVyKGN0eCwgc3dzLCBzcmMsIGRzdCwgcGt0LCBzdHJlYW0pO1xuICB9XG5cbiAgZ2V0IHN0cmVhbSgpIHtcbiAgICByZXR1cm4gdGhpcy5fc3RyZWFtO1xuICB9XG4gIGdldCB0aW1lQmFzZSgpIHtcbiAgICByZXR1cm4gdGhpcy5fY3R4LnRpbWVCYXNlO1xuICB9XG5cbiAgYXN5bmMgZW5jb2RlKGJncmE6IEJ1ZmZlciwgbXV4ZXI6IEZvcm1hdE11eGVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgeyBfc3JjOiBzcmMsIF9kc3Q6IGRzdCwgX3N3czogc3dzIH0gPSB0aGlzO1xuXG4gICAgLy8gUmV1c2Ugc3JjIGZyYW1lOiBtYWtlV3JpdGFibGUgKyBmcm9tQnVmZmVyICsgcHRzXG4gICAgRkZtcGVnRXJyb3IudGhyb3dJZkVycm9yKHNyYy5tYWtlV3JpdGFibGUoKSwgXCJzcmMubWFrZVdyaXRhYmxlXCIpO1xuICAgIEZGbXBlZ0Vycm9yLnRocm93SWZFcnJvcihzcmMuZnJvbUJ1ZmZlcihiZ3JhKSwgXCJzcmMuZnJvbUJ1ZmZlclwiKTtcbiAgICBzcmMucHRzID0gdGhpcy5wdHM7XG5cbiAgICBGRm1wZWdFcnJvci50aHJvd0lmRXJyb3IoZHN0Lm1ha2VXcml0YWJsZSgpLCBcImRzdC5tYWtlV3JpdGFibGVcIik7XG4gICAgRkZtcGVnRXJyb3IudGhyb3dJZkVycm9yKGF3YWl0IHN3cy5zY2FsZUZyYW1lKGRzdCwgc3JjKSwgXCJzd3Muc2NhbGVGcmFtZVwiKTtcblxuICAgIGRzdC5wdHMgPSB0aGlzLnB0cysrO1xuICAgIEZGbXBlZ0Vycm9yLnRocm93SWZFcnJvcihhd2FpdCB0aGlzLl9jdHguc2VuZEZyYW1lKGRzdCksIFwidmlkZW9DdHguc2VuZEZyYW1lXCIpO1xuICAgIGF3YWl0IHRoaXMuZHJhaW4obXV4ZXIpO1xuICB9XG5cbiAgYXN5bmMgZmx1c2gobXV4ZXI6IEZvcm1hdE11eGVyKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5fY3R4LnNlbmRGcmFtZShudWxsKTtcbiAgICBhd2FpdCB0aGlzLmRyYWluKG11eGVyKTtcbiAgfVxuXG4gIFtTeW1ib2wuZGlzcG9zZV0oKTogdm9pZCB7XG4gICAgdGhpcy5fcGt0LmZyZWUoKTtcbiAgICB0aGlzLl9zcmMuZnJlZSgpO1xuICAgIHRoaXMuX2RzdC5mcmVlKCk7XG4gICAgdGhpcy5fc3dzW1N5bWJvbC5kaXNwb3NlXSgpO1xuICAgIHRoaXMuX2N0eC5mcmVlQ29udGV4dCgpO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBkcmFpbihtdXhlcjogRm9ybWF0TXV4ZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBjb25zdCBwa3QgPSB0aGlzLl9wa3Q7XG4gICAgd2hpbGUgKHRydWUpIHtcbiAgICAgIGNvbnN0IHIgPSBhd2FpdCB0aGlzLl9jdHgucmVjZWl2ZVBhY2tldChwa3QpO1xuICAgICAgaWYgKHIgPT09IEFWRVJST1JfRUFHQUlOIHx8IHIgPT09IEFWRVJST1JfRU9GKSBicmVhaztcbiAgICAgIEZGbXBlZ0Vycm9yLnRocm93SWZFcnJvcihyLCBcInZpZGVvLnJlY2VpdmVQYWNrZXRcIik7XG4gICAgICBwa3Quc3RyZWFtSW5kZXggPSB0aGlzLl9zdHJlYW0uaW5kZXg7XG4gICAgICBwa3QucmVzY2FsZVRzKHRoaXMuX2N0eC50aW1lQmFzZSwgdGhpcy5fc3RyZWFtLnRpbWVCYXNlKTtcbiAgICAgIGF3YWl0IG11eGVyLndyaXRlUGFja2V0KHBrdCk7XG4gICAgICBwa3QudW5yZWYoKTtcbiAgICB9XG4gIH1cbn1cbiIsIi8vIENyZWF0ZWQgYnkgQXV0b2tha2EgKHFxMTkwOTY5ODQ5NEBnbWFpbC5jb20pIG9uIDIwMjYvMDMvMjEuXG5cbmltcG9ydCB7IExvZyB9IGZyb20gXCJub2RlLWF2XCI7XG5pbXBvcnQge1xuICBBVl9MT0dfRVJST1IsXG4gIEFWX0xPR19XQVJOSU5HLFxuICBBVl9QSVhfRk1UX1lVVkE0MjBQLFxuICBBVl9TQU1QTEVfRk1UX0ZMVCxcbiAgQVZfU0FNUExFX0ZNVF9GTFRQLFxuICBGRl9FTkNPREVSX0FBQyxcbiAgRkZfRU5DT0RFUl9MSUJYMjY1LFxuICB0eXBlIEZGQXVkaW9FbmNvZGVyLFxuICB0eXBlIEZGVmlkZW9FbmNvZGVyLFxufSBmcm9tIFwibm9kZS1hdi9jb25zdGFudHNcIjtcbmltcG9ydCB7IGpvaW4gfSBmcm9tIFwicGF0aFwiO1xuXG5pbXBvcnQgdHlwZSB7IFZpZGVvRm9ybWF0IH0gZnJvbSBcIi4uLy4uL3JlbmRlcmVyL3NjaGVtYVwiO1xuaW1wb3J0IHsgQ29uY3VycmVuY3lMaW1pdGVyIH0gZnJvbSBcIi4uL2xpbWl0ZXJcIjtcbmltcG9ydCB7IGxvZ2dlciB9IGZyb20gXCIuLi9sb2dnaW5nXCI7XG5pbXBvcnQgeyBBdWRpb0VuY29kZXIgfSBmcm9tIFwiLi9hdWRpb1wiO1xuaW1wb3J0IHsgRm9ybWF0TXV4ZXIgfSBmcm9tIFwiLi9tdXhlclwiO1xuaW1wb3J0IHsgVmlkZW9FbmNvZGVyIH0gZnJvbSBcIi4vdmlkZW9cIjtcblxuTG9nLnNldENhbGxiYWNrKChsZXZlbCwgbWVzc2FnZSkgPT4ge1xuICBjb25zdCBtc2cgPSBtZXNzYWdlLnRyaW1FbmQoKTtcbiAgaWYgKCFtc2cpIHJldHVybjtcbiAgaWYgKGxldmVsIDw9IEFWX0xPR19FUlJPUikgbG9nZ2VyLmVycm9yKG1zZyk7XG4gIGVsc2UgaWYgKGxldmVsIDw9IEFWX0xPR19XQVJOSU5HKSBsb2dnZXIud2Fybihtc2cpO1xufSk7XG5cbmludGVyZmFjZSBGb3JtYXRTcGVjIHtcbiAgdmlkZW9Db2RlY05hbWU6IEZGVmlkZW9FbmNvZGVyO1xuICBwaXhGbXQ6IHR5cGVvZiBBVl9QSVhfRk1UX1lVVkE0MjBQO1xuICBjb2RlY1RhZz86IHN0cmluZztcbiAgZ2xvYmFsSGVhZGVyOiBib29sZWFuO1xuICB2aWRlb09wdHM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG4gIGF1ZGlvQ29kZWNOYW1lOiBGRkF1ZGlvRW5jb2RlcjtcbiAgYXVkaW9TYW1wbGVGbXQ6IHR5cGVvZiBBVl9TQU1QTEVfRk1UX0ZMVCB8IHR5cGVvZiBBVl9TQU1QTEVfRk1UX0ZMVFA7XG4gIG91dFNhbXBsZVJhdGU6IG51bWJlcjtcbn1cblxuY29uc3QgRk9STUFUX1NQRUNTOiBSZWNvcmQ8VmlkZW9Gb3JtYXQsIEZvcm1hdFNwZWM+ID0ge1xuICBtcDQ6IHtcbiAgICB2aWRlb0NvZGVjTmFtZTogRkZfRU5DT0RFUl9MSUJYMjY1LFxuICAgIHBpeEZtdDogQVZfUElYX0ZNVF9ZVVZBNDIwUCxcbiAgICBjb2RlY1RhZzogXCJodmMxXCIsXG4gICAgZ2xvYmFsSGVhZGVyOiB0cnVlLFxuICAgIHZpZGVvT3B0czogeyBwcmVzZXQ6IFwidWx0cmFmYXN0XCIsIFwieDI2NS1wYXJhbXNcIjogXCJsb2ctbGV2ZWw9MVwiIH0sXG4gICAgYXVkaW9Db2RlY05hbWU6IEZGX0VOQ09ERVJfQUFDLFxuICAgIGF1ZGlvU2FtcGxlRm10OiBBVl9TQU1QTEVfRk1UX0ZMVFAsXG4gICAgb3V0U2FtcGxlUmF0ZTogNDRfMTAwLFxuICB9LFxuICB3ZWJtOiB7XG4gICAgdmlkZW9Db2RlY05hbWU6IFwibGlidnB4LXZwOVwiIGFzIEZGVmlkZW9FbmNvZGVyLFxuICAgIHBpeEZtdDogQVZfUElYX0ZNVF9ZVVZBNDIwUCxcbiAgICBnbG9iYWxIZWFkZXI6IGZhbHNlLFxuICAgIHZpZGVvT3B0czogeyBxdWFsaXR5OiBcInJlYWx0aW1lXCIsIFwiY3B1LXVzZWRcIjogXCI4XCIgfSxcbiAgICBhdWRpb0NvZGVjTmFtZTogXCJsaWJvcHVzXCIgYXMgRkZBdWRpb0VuY29kZXIsXG4gICAgYXVkaW9TYW1wbGVGbXQ6IEFWX1NBTVBMRV9GTVRfRkxULFxuICAgIG91dFNhbXBsZVJhdGU6IDQ4XzAwMCxcbiAgfSxcbn07XG5cbmludGVyZmFjZSBGb3JtYXRTdGF0ZSB7XG4gIGZvcm1hdDogVmlkZW9Gb3JtYXQ7XG4gIG91dFBhdGg6IHN0cmluZztcbiAgbXV4ZXI6IEZvcm1hdE11eGVyO1xuICB2aWRlbzogVmlkZW9FbmNvZGVyO1xuICBhdWRpbz86IEF1ZGlvRW5jb2RlcjtcbiAgbGltaXRlcjogQ29uY3VycmVuY3lMaW1pdGVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEVuY29kZXJQaXBlbGluZU9wdGlvbnMge1xuICB3aWR0aDogbnVtYmVyO1xuICBoZWlnaHQ6IG51bWJlcjtcbiAgZnBzOiBudW1iZXI7XG4gIGZvcm1hdHM6IFZpZGVvRm9ybWF0W107XG4gIG91dERpcjogc3RyaW5nO1xuICB3aXRoQXVkaW8/OiBib29sZWFuO1xuICB2aWRlb0JpdHJhdGU/OiBudW1iZXI7XG4gIGF1ZGlvQml0cmF0ZT86IG51bWJlcjtcbn1cblxuZXhwb3J0IHR5cGUgRW5jb2RlclJlc3VsdCA9IFBhcnRpYWw8UmVjb3JkPFZpZGVvRm9ybWF0LCBzdHJpbmc+PjtcblxuZXhwb3J0IGNsYXNzIEVuY29kZXJQaXBlbGluZSB7XG4gIHByaXZhdGUgcmVhZG9ubHkgX3N0YXRlczogRm9ybWF0U3RhdGVbXTtcblxuICBwcml2YXRlIGNvbnN0cnVjdG9yKHN0YXRlczogRm9ybWF0U3RhdGVbXSkge1xuICAgIHRoaXMuX3N0YXRlcyA9IHN0YXRlcztcbiAgfVxuXG4gIHN0YXRpYyBhc3luYyBjcmVhdGUoe1xuICAgIHdpZHRoLFxuICAgIGhlaWdodCxcbiAgICBmcHMsXG4gICAgZm9ybWF0cyxcbiAgICBvdXREaXIsXG4gICAgd2l0aEF1ZGlvID0gZmFsc2UsXG4gICAgdmlkZW9CaXRyYXRlID0gOF8wMDBfMDAwLFxuICAgIGF1ZGlvQml0cmF0ZSA9IDEyOF8wMDAsXG4gIH06IEVuY29kZXJQaXBlbGluZU9wdGlvbnMpOiBQcm9taXNlPEVuY29kZXJQaXBlbGluZT4ge1xuICAgIGNvbnN0IHN0YXRlcyA9IGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgZm9ybWF0cy5tYXAoYXN5bmMgKGZvcm1hdCkgPT4ge1xuICAgICAgICBjb25zdCBzcGVjID0gRk9STUFUX1NQRUNTW2Zvcm1hdF07XG4gICAgICAgIGNvbnN0IG91dFBhdGggPSBqb2luKG91dERpciwgYG91dHB1dC4ke2Zvcm1hdH1gKTtcbiAgICAgICAgY29uc3QgbXV4ZXIgPSBuZXcgRm9ybWF0TXV4ZXIob3V0UGF0aCk7XG5cbiAgICAgICAgY29uc3QgdmlkZW8gPSBhd2FpdCBWaWRlb0VuY29kZXIuY3JlYXRlKHtcbiAgICAgICAgICB3aWR0aCxcbiAgICAgICAgICBoZWlnaHQsXG4gICAgICAgICAgZnBzLFxuICAgICAgICAgIGNvZGVjTmFtZTogc3BlYy52aWRlb0NvZGVjTmFtZSxcbiAgICAgICAgICBwaXhGbXQ6IHNwZWMucGl4Rm10LFxuICAgICAgICAgIGNvZGVjVGFnOiBzcGVjLmNvZGVjVGFnLFxuICAgICAgICAgIGdsb2JhbEhlYWRlcjogc3BlYy5nbG9iYWxIZWFkZXIsXG4gICAgICAgICAgY29kZWNPcHRzOiBzcGVjLnZpZGVvT3B0cyxcbiAgICAgICAgICBiaXRyYXRlOiB2aWRlb0JpdHJhdGUsXG4gICAgICAgICAgbXV4ZXIsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGxldCBhdWRpbzogQXVkaW9FbmNvZGVyIHwgdW5kZWZpbmVkO1xuICAgICAgICBpZiAod2l0aEF1ZGlvKSB7XG4gICAgICAgICAgYXVkaW8gPSBhd2FpdCBBdWRpb0VuY29kZXIuY3JlYXRlKHtcbiAgICAgICAgICAgIG91dFNhbXBsZVJhdGU6IHNwZWMub3V0U2FtcGxlUmF0ZSxcbiAgICAgICAgICAgIG91dFNhbXBsZUZtdDogc3BlYy5hdWRpb1NhbXBsZUZtdCxcbiAgICAgICAgICAgIGNvZGVjTmFtZTogc3BlYy5hdWRpb0NvZGVjTmFtZSxcbiAgICAgICAgICAgIGdsb2JhbEhlYWRlcjogc3BlYy5nbG9iYWxIZWFkZXIsXG4gICAgICAgICAgICBiaXRyYXRlOiBhdWRpb0JpdHJhdGUsXG4gICAgICAgICAgICBtdXhlcixcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGF3YWl0IG11eGVyLm9wZW4oKTtcbiAgICAgICAgY29uc3QgbGltaXRlciA9IG5ldyBDb25jdXJyZW5jeUxpbWl0ZXIoMSk7XG4gICAgICAgIHJldHVybiB7IGZvcm1hdCwgb3V0UGF0aCwgbXV4ZXIsIHZpZGVvLCBhdWRpbywgbGltaXRlciB9IHNhdGlzZmllcyBGb3JtYXRTdGF0ZTtcbiAgICAgIH0pLFxuICAgICk7XG4gICAgcmV0dXJuIG5ldyBFbmNvZGVyUGlwZWxpbmUoc3RhdGVzKTtcbiAgfVxuXG4gIHNldHVwQXVkaW8oc2FtcGxlUmF0ZTogbnVtYmVyKTogdm9pZCB7XG4gICAgZm9yIChjb25zdCBzIG9mIHRoaXMuX3N0YXRlcykge1xuICAgICAgcy5hdWRpbz8uc2V0SW5wdXRSYXRlKHNhbXBsZVJhdGUpO1xuICAgIH1cbiAgfVxuXG4gIGFzeW5jIGVuY29kZUZyYW1lKGJncmE6IEJ1ZmZlciwgX3RpbWVzdGFtcFVzOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBhd2FpdCBQcm9taXNlLmFsbCh0aGlzLl9zdGF0ZXMubWFwKChzKSA9PiBzLmxpbWl0ZXIuc2NoZWR1bGUoKCkgPT4gcy52aWRlby5lbmNvZGUoYmdyYSwgcy5tdXhlcikpKSk7XG4gIH1cblxuICBhc3luYyBlbmNvZGVBdWRpbyhwY206IEJ1ZmZlcik6IFByb21pc2U8dm9pZD4ge1xuICAgIGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgdGhpcy5fc3RhdGVzLm1hcCgocykgPT4ge1xuICAgICAgICBpZiAoIXMuYXVkaW8pIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgICAgICAgcmV0dXJuIHMubGltaXRlci5zY2hlZHVsZSgoKSA9PiBzLmF1ZGlvIS5lbmNvZGUocGNtLCBzLm11eGVyKSk7XG4gICAgICB9KSxcbiAgICApO1xuICB9XG5cbiAgYXN5bmMgZmluaXNoKCk6IFByb21pc2U8RW5jb2RlclJlc3VsdD4ge1xuICAgIGNvbnN0IHJlc3VsdDogRW5jb2RlclJlc3VsdCA9IHt9O1xuICAgIGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgdGhpcy5fc3RhdGVzLm1hcChhc3luYyAocykgPT4ge1xuICAgICAgICBhd2FpdCBzLmxpbWl0ZXIuZW5kKCk7XG4gICAgICAgIGF3YWl0IHMuYXVkaW8/LmZsdXNoKHMubXV4ZXIpO1xuICAgICAgICBhd2FpdCBzLnZpZGVvLmZsdXNoKHMubXV4ZXIpO1xuICAgICAgICByZXN1bHRbcy5mb3JtYXRdID0gcy5vdXRQYXRoO1xuICAgICAgICB1c2luZyBfYSA9IHMuYXVkaW87XG4gICAgICAgIHVzaW5nIF92ID0gcy52aWRlbztcbiAgICAgICAgYXdhaXQgdXNpbmcgX20gPSBzLm11eGVyO1xuICAgICAgfSksXG4gICAgKTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG59XG4iLCIvLyBDcmVhdGVkIGJ5IEF1dG9rYWthIChxcTE5MDk2OTg0OTRAZ21haWwuY29tKSBvbiAyMDI2LzAyLzA2LlxuXG5pbXBvcnQgdHlwZSB7IE5hdGl2ZUltYWdlIH0gZnJvbSBcImVsZWN0cm9uXCI7XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0VtcHR5KGltYWdlOiBOYXRpdmVJbWFnZSkge1xuICBjb25zdCBzaXplID0gaW1hZ2UuZ2V0U2l6ZSgpO1xuICBpZiAoc2l6ZS53aWR0aCA9PT0gMCB8fCBzaXplLmhlaWdodCA9PT0gMCkgcmV0dXJuIHRydWU7XG4gIHJldHVybiBpbWFnZS5pc0VtcHR5KCk7XG59XG4iLCIvLyBDcmVhdGVkIGJ5IEF1dG9rYWthIChxcTE5MDk2OTg0OTRAZ21haWwuY29tKSBvbiAyMDI2LzAzLzAyLlxuXG5pbXBvcnQgeyByYW5kb21VVUlEIH0gZnJvbSBcImNyeXB0b1wiO1xuaW1wb3J0IHsgaXBjTWFpbiwgc2Vzc2lvbiB9IGZyb20gXCJlbGVjdHJvblwiO1xuaW1wb3J0IHsgcm0sIHdyaXRlRmlsZSB9IGZyb20gXCJmcy9wcm9taXNlc1wiO1xuaW1wb3J0IHsgdG1wZGlyIH0gZnJvbSBcIm9zXCI7XG5pbXBvcnQgeyBqb2luIH0gZnJvbSBcInBhdGhcIjtcbmltcG9ydCB0eXBlIHsgRW5jb2RlclBpcGVsaW5lIH0gZnJvbSBcIi4uL2Jhc2UvZW5jb2Rlci9lbmNvZGVyXCI7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tIFwiLi4vYmFzZS9sb2dnaW5nXCI7XG5cbmNvbnN0IFRBRyA9IFwiW0F1ZGlvQ2FwdHVyZV1cIjtcblxuY29uc3QgQVVESU9fQ0FQVFVSRV9TQ1JJUFQgPSBgXG4oZnVuY3Rpb24oKSB7XG4gIGlmICh3aW5kb3cuX19wdXBfYXVkaW9fY2FwdHVyaW5nX18pIHJldHVybjtcbiAgd2luZG93Ll9fcHVwX2F1ZGlvX2NhcHR1cmluZ19fID0gdHJ1ZTtcblxuICBjb25zdCB7IGlwY1JlbmRlcmVyIH0gPSByZXF1aXJlKCdlbGVjdHJvbicpO1xuICBjb25zdCBjYXB0dXJlZENvbnRleHRzID0gbmV3IFdlYWtTZXQoKTtcbiAgY29uc3Qgc291cmNlZEVsZW1lbnRzID0gbmV3IFdlYWtTZXQoKTtcbiAgbGV0IG1ldGFTZW50ID0gZmFsc2U7XG5cbiAgY29uc3Qgb3JpZ0NyZWF0ZU1FUyA9IEF1ZGlvQ29udGV4dC5wcm90b3R5cGUuY3JlYXRlTWVkaWFFbGVtZW50U291cmNlO1xuICBBdWRpb0NvbnRleHQucHJvdG90eXBlLmNyZWF0ZU1lZGlhRWxlbWVudFNvdXJjZSA9IGZ1bmN0aW9uKGVsKSB7XG4gICAgc291cmNlZEVsZW1lbnRzLmFkZChlbCk7XG4gICAgcmV0dXJuIG9yaWdDcmVhdGVNRVMuY2FsbCh0aGlzLCBlbCk7XG4gIH07XG5cbiAgY29uc3Qgb3JpZ0Nvbm5lY3QgPSBBdWRpb05vZGUucHJvdG90eXBlLmNvbm5lY3Q7XG4gIEF1ZGlvTm9kZS5wcm90b3R5cGUuY29ubmVjdCA9IGZ1bmN0aW9uKGRlc3QsIG91dElkeCwgaW5JZHgpIHtcbiAgICBjb25zdCBjYXB0dXJlTm9kZSA9IGRlc3Q/LmNvbnRleHQ/Ll9fcHVwX2NhcHR1cmVOb2RlX187XG4gICAgaWYgKGNhcHR1cmVOb2RlICYmIGRlc3QgPT09IGRlc3QuY29udGV4dC5kZXN0aW5hdGlvbiAmJiB0aGlzICE9PSBjYXB0dXJlTm9kZSkge1xuICAgICAgb3JpZ0Nvbm5lY3QuY2FsbCh0aGlzLCBjYXB0dXJlTm9kZSwgb3V0SWR4LCBpbklkeCk7XG4gICAgfVxuICAgIHJldHVybiBvcmlnQ29ubmVjdC5jYWxsKHRoaXMsIGRlc3QsIG91dElkeCwgaW5JZHgpO1xuICB9O1xuXG4gIGNvbnN0IE9yaWdBQyA9IHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dDtcbiAgaWYgKCFPcmlnQUMpIHJldHVybjtcblxuICBmdW5jdGlvbiBQYXRjaGVkQUMoKSB7XG4gICAgY29uc3QgY3R4ID0gbmV3IE9yaWdBQyguLi5hcmd1bWVudHMpO1xuICAgIGlmICghY2FwdHVyZWRDb250ZXh0cy5oYXMoY3R4KSkge1xuICAgICAgY2FwdHVyZWRDb250ZXh0cy5hZGQoY3R4KTtcbiAgICAgIGlmICghbWV0YVNlbnQpIHtcbiAgICAgICAgbWV0YVNlbnQgPSB0cnVlO1xuICAgICAgICBpcGNSZW5kZXJlci5zZW5kKCdhdWRpby1tZXRhJywgeyBzYW1wbGVSYXRlOiBjdHguc2FtcGxlUmF0ZSB9KTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG5vZGUgPSBjdHguY3JlYXRlU2NyaXB0UHJvY2Vzc29yKDQwOTYsIDIsIDIpO1xuICAgICAgbm9kZS5vbmF1ZGlvcHJvY2VzcyA9IChlKSA9PiB7XG4gICAgICAgIGNvbnN0IEwgPSBlLmlucHV0QnVmZmVyLmdldENoYW5uZWxEYXRhKDApO1xuICAgICAgICBjb25zdCBSID0gZS5pbnB1dEJ1ZmZlci5nZXRDaGFubmVsRGF0YSgxKTtcbiAgICAgICAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheShMLmxlbmd0aCAqIDIpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IEwubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBvdXRbaSAqIDJdID0gTFtpXTtcbiAgICAgICAgICBvdXRbaSAqIDIgKyAxXSA9IFJbaV07XG4gICAgICAgIH1cbiAgICAgICAgaXBjUmVuZGVyZXIuc2VuZCgnYXVkaW8tY2h1bmsnLCBCdWZmZXIuZnJvbShvdXQuYnVmZmVyKSk7XG4gICAgICB9O1xuICAgICAgbm9kZS5jb25uZWN0KGN0eC5kZXN0aW5hdGlvbik7XG4gICAgICBjdHguX19wdXBfY2FwdHVyZU5vZGVfXyA9IG5vZGU7XG4gICAgfVxuICAgIHJldHVybiBjdHg7XG4gIH1cbiAgUGF0Y2hlZEFDLnByb3RvdHlwZSA9IE9yaWdBQy5wcm90b3R5cGU7XG4gIE9iamVjdC5zZXRQcm90b3R5cGVPZihQYXRjaGVkQUMsIE9yaWdBQyk7XG4gIHdpbmRvdy5BdWRpb0NvbnRleHQgPSBQYXRjaGVkQUM7XG4gIGlmICgnd2Via2l0QXVkaW9Db250ZXh0JyBpbiB3aW5kb3cpIHdpbmRvdy53ZWJraXRBdWRpb0NvbnRleHQgPSBQYXRjaGVkQUM7XG5cbiAgY29uc3Qgb3JpZ1BsYXkgPSBIVE1MTWVkaWFFbGVtZW50LnByb3RvdHlwZS5wbGF5O1xuICBIVE1MTWVkaWFFbGVtZW50LnByb3RvdHlwZS5wbGF5ID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLl9fcHVwX2NhcHR1cmVkX18pIHtcbiAgICAgIHRoaXMuX19wdXBfY2FwdHVyZWRfXyA9IHRydWU7XG4gICAgICBjb25zdCBlbCA9IHRoaXM7XG4gICAgICBQcm9taXNlLnJlc29sdmUoKS50aGVuKCgpID0+IHtcbiAgICAgICAgaWYgKCFzb3VyY2VkRWxlbWVudHMuaGFzKGVsKSkge1xuICAgICAgICAgIGNvbnN0IGN0eCA9IG5ldyBQYXRjaGVkQUMoKTtcbiAgICAgICAgICBjdHguY3JlYXRlTWVkaWFFbGVtZW50U291cmNlKGVsKS5jb25uZWN0KGN0eC5kZXN0aW5hdGlvbik7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gb3JpZ1BsYXkuY2FsbCh0aGlzKTtcbiAgfTtcbn0pKCk7XG5gO1xuXG5leHBvcnQgaW50ZXJmYWNlIEF1ZGlvQ2FwdHVyZSB7XG4gIHRlYXJkb3duKCk6IFByb21pc2U8dm9pZD47XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzZXR1cEF1ZGlvQ2FwdHVyZShwaXBlbGluZTogRW5jb2RlclBpcGVsaW5lKTogUHJvbWlzZTxBdWRpb0NhcHR1cmU+IHtcbiAgY29uc3QgcHJlbG9hZFBhdGggPSBqb2luKHRtcGRpcigpLCBgcHVwX2F1ZGlvX3ByZWxvYWRfJHtyYW5kb21VVUlEKCl9LmpzYCk7XG4gIGF3YWl0IHdyaXRlRmlsZShwcmVsb2FkUGF0aCwgQVVESU9fQ0FQVFVSRV9TQ1JJUFQpO1xuICBzZXNzaW9uLmRlZmF1bHRTZXNzaW9uLnJlZ2lzdGVyUHJlbG9hZFNjcmlwdCh7XG4gICAgdHlwZTogXCJmcmFtZVwiLFxuICAgIGlkOiBcInB1cC1hdWRpb1wiLFxuICAgIGZpbGVQYXRoOiBwcmVsb2FkUGF0aCxcbiAgfSk7XG5cbiAgaXBjTWFpbi5vbmNlKFwiYXVkaW8tbWV0YVwiLCAoX2UsIGRhdGE6IHsgc2FtcGxlUmF0ZTogbnVtYmVyIH0pID0+IHtcbiAgICBwaXBlbGluZS5zZXR1cEF1ZGlvKGRhdGEuc2FtcGxlUmF0ZSk7XG4gIH0pO1xuICBpcGNNYWluLm9uKFwiYXVkaW8tY2h1bmtcIiwgYXN5bmMgKF9lLCBidWZmZXI6IEJ1ZmZlcikgPT4ge1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBwaXBlbGluZS5lbmNvZGVBdWRpbyhidWZmZXIpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGxvZ2dlci5lcnJvcihUQUcsIFwiZmFpbGVkIHRvIGVuY29kZSBhdWRpbyBjaHVuazpcIiwgZSk7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4ge1xuICAgIGFzeW5jIHRlYXJkb3duKCkge1xuICAgICAgaXBjTWFpbi5yZW1vdmVBbGxMaXN0ZW5lcnMoXCJhdWRpby1tZXRhXCIpO1xuICAgICAgaXBjTWFpbi5yZW1vdmVBbGxMaXN0ZW5lcnMoXCJhdWRpby1jaHVua1wiKTtcbiAgICAgIHNlc3Npb24uZGVmYXVsdFNlc3Npb24udW5yZWdpc3RlclByZWxvYWRTY3JpcHQoXCJwdXAtYXVkaW9cIik7XG4gICAgICBhd2FpdCBybShwcmVsb2FkUGF0aCwgeyBmb3JjZTogdHJ1ZSB9KTtcbiAgICB9LFxuICB9O1xufVxuIiwiLy8gQ3JlYXRlZCBieSBBdXRva2FrYSAocXExOTA5Njk4NDk0QGdtYWlsLmNvbSkgb24gMjAyNi8wMi8wOS5cblxuaW1wb3J0IHR5cGUgeyBEZWJ1Z2dlciwgU2l6ZSB9IGZyb20gXCJlbGVjdHJvblwiO1xuXG5leHBvcnQgY29uc3QgRlJBTUVfU1lOQ19NQVJLRVJfV0lEVEggPSAzMjtcbmV4cG9ydCBjb25zdCBGUkFNRV9TWU5DX01BUktFUl9IRUlHSFQgPSAxO1xuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRXcmFwcGVySFRNTCh0YXJnZXRVUkw6IHN0cmluZywgc2l6ZTogU2l6ZSk6IHN0cmluZyB7XG4gIGNvbnN0IHsgd2lkdGgsIGhlaWdodCB9ID0gc2l6ZTtcbiAgcmV0dXJuIGA8IURPQ1RZUEUgaHRtbD5cbjxodG1sPlxuPGhlYWQ+XG4gIDxtZXRhIGNoYXJzZXQ9XCJVVEYtOFwiPlxuICA8c3R5bGU+XG4gICAgKiB7IG1hcmdpbjogMDsgcGFkZGluZzogMDsgYm94LXNpemluZzogYm9yZGVyLWJveDsgfVxuICAgIGh0bWwsIGJvZHkgeyB3aWR0aDogJHt3aWR0aH1weDsgaGVpZ2h0OiAke2hlaWdodCArIDF9cHg7IG92ZXJmbG93OiBoaWRkZW47IH1cbiAgICAjdGFyZ2V0IHsgXG4gICAgICBwb3NpdGlvbjogYWJzb2x1dGU7IFxuICAgICAgdG9wOiAwOyBcbiAgICAgIGxlZnQ6IDA7IFxuICAgICAgd2lkdGg6ICR7d2lkdGh9cHg7IFxuICAgICAgaGVpZ2h0OiAke2hlaWdodH1weDsgXG4gICAgICBib3JkZXI6IG5vbmU7IFxuICAgICAgZGlzcGxheTogYmxvY2s7XG4gICAgfVxuICAgICNzdGVnbyB7IFxuICAgICAgcG9zaXRpb246IGFic29sdXRlOyBcbiAgICAgIHRvcDogJHtoZWlnaHR9cHg7IFxuICAgICAgbGVmdDogMDsgXG4gICAgICB3aWR0aDogJHt3aWR0aH1weDsgXG4gICAgICBoZWlnaHQ6IDFweDsgXG4gICAgICBkaXNwbGF5OiBibG9jaztcbiAgICAgIGltYWdlLXJlbmRlcmluZzogcGl4ZWxhdGVkO1xuICAgIH1cbiAgPC9zdHlsZT5cbjwvaGVhZD5cbjxib2R5PlxuICA8aWZyYW1lIGlkPVwidGFyZ2V0XCIgc3JjPVwiJHt0YXJnZXRVUkx9XCI+PC9pZnJhbWU+XG4gIDxjYW52YXMgaWQ9XCJzdGVnb1wiIHdpZHRoPVwiJHt3aWR0aH1cIiBoZWlnaHQ9XCIxXCI+PC9jYW52YXM+XG4gIDxzY3JpcHQ+XG4gICAgKGZ1bmN0aW9uKCkge1xuICAgICAgY29uc3QgV0lEVEggPSAke3dpZHRofTtcbiAgICAgIGNvbnN0IE1BUktFUl9XSURUSCA9ICR7RlJBTUVfU1lOQ19NQVJLRVJfV0lEVEh9O1xuICAgICAgY29uc3QgY2FudmFzID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3N0ZWdvJyk7XG4gICAgICBjb25zdCBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnLCB7IHdpbGxSZWFkRnJlcXVlbnRseTogdHJ1ZSB9KTtcbiAgICAgIGxldCBzdGFydFRpbWUgPSBudWxsO1xuICAgICAgbGV0IHJhZklkID0gbnVsbDtcblxuICAgICAgZnVuY3Rpb24gZW5jb2RlVGltZXN0YW1wKHRpbWVzdGFtcE1zKSB7XG4gICAgICAgIGNvbnN0IGltYWdlRGF0YSA9IGN0eC5jcmVhdGVJbWFnZURhdGEoV0lEVEgsIDEpO1xuICAgICAgICBjb25zdCBkYXRhID0gaW1hZ2VEYXRhLmRhdGE7XG4gICAgICAgIFxuICAgICAgICBjb25zdCB0aW1lc3RhbXBJbnQgPSBNYXRoLmZsb29yKHRpbWVzdGFtcE1zKSA+Pj4gMDtcbiAgICAgICAgXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgTUFSS0VSX1dJRFRIOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBiaXQgPSAodGltZXN0YW1wSW50ID4+PiAoTUFSS0VSX1dJRFRIIC0gMSAtIGkpKSAmIDE7XG4gICAgICAgICAgY29uc3QgdmFsdWUgPSBiaXQgPyAyNTUgOiAwO1xuICAgICAgICAgIGNvbnN0IGlkeCA9IGkgKiA0O1xuICAgICAgICAgIGRhdGFbaWR4XSA9IHZhbHVlO1xuICAgICAgICAgIGRhdGFbaWR4ICsgMV0gPSB2YWx1ZTtcbiAgICAgICAgICBkYXRhW2lkeCArIDJdID0gdmFsdWU7XG4gICAgICAgICAgZGF0YVtpZHggKyAzXSA9IDI1NTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgZm9yIChsZXQgaSA9IE1BUktFUl9XSURUSDsgaSA8IFdJRFRIOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBpZHggPSBpICogNDtcbiAgICAgICAgICBkYXRhW2lkeF0gPSAwO1xuICAgICAgICAgIGRhdGFbaWR4ICsgMV0gPSAwO1xuICAgICAgICAgIGRhdGFbaWR4ICsgMl0gPSAwO1xuICAgICAgICAgIGRhdGFbaWR4ICsgM10gPSAyNTU7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIGN0eC5wdXRJbWFnZURhdGEoaW1hZ2VEYXRhLCAwLCAwKTtcbiAgICAgIH1cblxuICAgICAgZnVuY3Rpb24gdXBkYXRlTG9vcCgpIHtcbiAgICAgICAgaWYgKHN0YXJ0VGltZSA9PT0gbnVsbCkgcmV0dXJuO1xuICAgICAgICBjb25zdCBlbGFwc2VkID0gcGVyZm9ybWFuY2Uubm93KCkgLSBzdGFydFRpbWU7XG4gICAgICAgIGVuY29kZVRpbWVzdGFtcChlbGFwc2VkKTtcbiAgICAgICAgcmFmSWQgPSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodXBkYXRlTG9vcCk7XG4gICAgICB9XG5cbiAgICAgIHdpbmRvdy5fX3B1cF9zdGFydF9yZWNvcmRpbmdfXyA9ICgpID0+IHtcbiAgICAgICAgc3RhcnRUaW1lID0gcGVyZm9ybWFuY2Uubm93KCk7XG4gICAgICAgIGVuY29kZVRpbWVzdGFtcCgwKTtcbiAgICAgICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHVwZGF0ZUxvb3ApO1xuICAgICAgfTtcblxuICAgICAgd2luZG93Ll9fcHVwX3N0b3BfcmVjb3JkaW5nX18gPSAoKSA9PiB7XG4gICAgICAgIGlmIChyYWZJZCAhPT0gbnVsbCkge1xuICAgICAgICAgIGNhbmNlbEFuaW1hdGlvbkZyYW1lKHJhZklkKTtcbiAgICAgICAgICByYWZJZCA9IG51bGw7XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgfSkoKTtcbiAgPC9zY3JpcHQ+XG48L2JvZHk+XG48L2h0bWw+YDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlY29kZVRpbWVzdGFtcChiaXRtYXA6IEJ1ZmZlciwgc2l6ZTogU2l6ZSk6IG51bWJlciB8IHVuZGVmaW5lZCB7XG4gIGNvbnN0IHsgd2lkdGgsIGhlaWdodCB9ID0gc2l6ZTtcbiAgaWYgKHdpZHRoIDwgRlJBTUVfU1lOQ19NQVJLRVJfV0lEVEggfHwgaGVpZ2h0IDwgMikge1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cblxuICBjb25zdCBtYXJrZXJSb3cgPSBoZWlnaHQgLSAxO1xuXG4gIGxldCB0aW1lc3RhbXAgPSAwO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IEZSQU1FX1NZTkNfTUFSS0VSX1dJRFRIOyBpKyspIHtcbiAgICBjb25zdCBwaXhlbElkeCA9IChtYXJrZXJSb3cgKiB3aWR0aCArIGkpICogNDtcbiAgICBjb25zdCByID0gYml0bWFwW3BpeGVsSWR4XSA/PyAwO1xuICAgIGNvbnN0IGJpdCA9IHIgPiAxMjcgPyAxIDogMDtcbiAgICB0aW1lc3RhbXAgPSAodGltZXN0YW1wIDw8IDEpIHwgYml0O1xuICB9XG5cbiAgdGltZXN0YW1wID0gdGltZXN0YW1wID4+PiAwO1xuXG4gIGlmICghTnVtYmVyLmlzRmluaXRlKHRpbWVzdGFtcCkgfHwgdGltZXN0YW1wIDwgMCB8fCB0aW1lc3RhbXAgPiAxZTcpIHtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG5cbiAgcmV0dXJuIHRpbWVzdGFtcDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0YXJ0U3luYyhjZHA6IERlYnVnZ2VyKSB7XG4gIHJldHVybiBjZHAuc2VuZENvbW1hbmQoXCJSdW50aW1lLmV2YWx1YXRlXCIsIHtcbiAgICBleHByZXNzaW9uOiBgd2luZG93Ll9fcHVwX3N0YXJ0X3JlY29yZGluZ19fKClgLFxuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0b3BTeW5jKGNkcDogRGVidWdnZXIpIHtcbiAgcmV0dXJuIGNkcC5zZW5kQ29tbWFuZChcIlJ1bnRpbWUuZXZhbHVhdGVcIiwge1xuICAgIGV4cHJlc3Npb246IGB3aW5kb3cuX19wdXBfc3RvcF9yZWNvcmRpbmdfXygpYCxcbiAgfSk7XG59XG4iLCIvLyBDcmVhdGVkIGJ5IEF1dG9rYWthIChxcTE5MDk2OTg0OTRAZ21haWwuY29tKSBvbiAyMDI2LzAyLzA5LlxuXG5leHBvcnQgZnVuY3Rpb24gc2xlZXAobXM6IG51bWJlcikge1xuICByZXR1cm4gbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUpID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgbXMpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBlcmlvZGljYWwoY2FsbGJhY2s6IChjb3VudDogbnVtYmVyKSA9PiBQcm9taXNlPHZvaWQ+IHwgdm9pZCwgbXM6IG51bWJlcikge1xuICBsZXQgdG9rZW46IE5vZGVKUy5UaW1lb3V0O1xuICBsZXQgY2xvc2VkID0gZmFsc2U7XG4gIGFzeW5jIGZ1bmN0aW9uIHRpY2soY291bnQ6IG51bWJlcikge1xuICAgIGF3YWl0IGNhbGxiYWNrKGNvdW50KTtcbiAgICBpZiAoY2xvc2VkKSByZXR1cm47XG4gICAgdG9rZW4gPSBzZXRUaW1lb3V0KCgpID0+IHRpY2soY291bnQgKyAxKSwgbXMpO1xuICB9XG4gIHRva2VuID0gc2V0VGltZW91dCgoKSA9PiB0aWNrKDApLCBtcyk7XG4gIHJldHVybiAoKSA9PiB7XG4gICAgY2xvc2VkID0gdHJ1ZTtcbiAgICBjbGVhclRpbWVvdXQodG9rZW4pO1xuICB9O1xufVxuIiwiLy8gQ3JlYXRlZCBieSBBdXRva2FrYSAocXExOTA5Njk4NDk0QGdtYWlsLmNvbSkgb24gMjAyNi8wMi8wNS5cblxuaW1wb3J0IHsgc2V0VGltZW91dCB9IGZyb20gXCJ0aW1lcnMvcHJvbWlzZXNcIjtcbmltcG9ydCB7IHNsZWVwIH0gZnJvbSBcIi4vdGltaW5nXCI7XG5cbmV4cG9ydCBpbnRlcmZhY2UgUmV0cnlPcHRpb25zPEFyZ3MgZXh0ZW5kcyBhbnlbXSwgUmV0PiB7XG4gIGZuOiAoLi4uYXJnczogQXJncykgPT4gUHJvbWlzZTxSZXQ+O1xuICBtYXhBdHRlbXB0cz86IG51bWJlcjtcbiAgdGltZW91dD86IG51bWJlcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHVzZVJldHJ5PEFyZ3MgZXh0ZW5kcyBhbnlbXSwgUmV0Pih7IGZuLCBtYXhBdHRlbXB0cyA9IDMsIHRpbWVvdXQgfTogUmV0cnlPcHRpb25zPEFyZ3MsIFJldD4pIHtcbiAgY29uc3QgdGltZW91dEVycm9yID0gbmV3IEVycm9yKGB0aW1lb3V0IG92ZXIgJHt0aW1lb3V0fW1zYCk7XG4gIHJldHVybiBhc3luYyBmdW5jdGlvbiAoLi4uYXJnczogQXJncykge1xuICAgIGxldCBhdHRlbXB0ID0gMDtcbiAgICB3aGlsZSAodHJ1ZSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgcHJvbWlzZXMgPSBbZm4oLi4uYXJncyldO1xuICAgICAgICBpZiAodGltZW91dCkge1xuICAgICAgICAgIHByb21pc2VzLnB1c2goXG4gICAgICAgICAgICBzZXRUaW1lb3V0KHRpbWVvdXQpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgICB0aHJvdyB0aW1lb3V0RXJyb3I7XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBhd2FpdCBQcm9taXNlLnJhY2UocHJvbWlzZXMpO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBhdHRlbXB0Kys7XG4gICAgICAgIGlmIChhdHRlbXB0ID49IG1heEF0dGVtcHRzKSB7XG4gICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgfVxuICAgICAgICBhd2FpdCBzbGVlcChNYXRoLnBvdygyLCBhdHRlbXB0KSAqIDEwMCArIE1hdGgucmFuZG9tKCkgKiAxMDApO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbn1cbiIsIi8vIENyZWF0ZWQgYnkgQXV0b2tha2EgKHFxMTkwOTY5ODQ5NEBnbWFpbC5jb20pIG9uIDIwMjYvMDIvMDkuXG5cbmNvbnN0IFNVUFBPUlRFRF9QUk9UT0NPTFMgPSBbXCJmaWxlOlwiLCBcImh0dHA6XCIsIFwiaHR0cHM6XCIsIFwiZGF0YTpcIl07XG5jb25zdCBTT1VSQ0VfUEFUVEVSTiA9IC9eKGZpbGU6fGh0dHBzPzp8ZGF0YTopLztcblxuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrSFRNTChzb3VyY2U6IHN0cmluZyk6IHZvaWQge1xuICBpZiAoU09VUkNFX1BBVFRFUk4udGVzdChzb3VyY2UpKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3QgcHJvdG9jb2wgPSBzb3VyY2Uuc3BsaXQoXCI6XCIpWzBdICsgXCI6XCI7XG4gIGNvbnN0IG1lc3NhZ2UgPSBTVVBQT1JURURfUFJPVE9DT0xTLmluY2x1ZGVzKHByb3RvY29sKVxuICAgID8gYHVuc3VwcG9ydGVkIHByb3RvY29sOiAke3Byb3RvY29sfSwgZXhwZWN0ZWQgJHtTVVBQT1JURURfUFJPVE9DT0xTLmpvaW4oXCIsIFwiKX1gXG4gICAgOiBgaW52YWxpZCBzb3VyY2UgZm9ybWF0LCBleHBlY3RlZCAke1NVUFBPUlRFRF9QUk9UT0NPTFMuam9pbihcIiwgXCIpfWA7XG5cbiAgdGhyb3cgbmV3IEVycm9yKG1lc3NhZ2UpO1xufVxuIiwiLy8gQ3JlYXRlZCBieSBBdXRva2FrYSAocXExOTA5Njk4NDk0QGdtYWlsLmNvbSkgb24gMjAyNi8wMy8xMC5cblxuZXhwb3J0IGludGVyZmFjZSBXYWl0T3B0aW9ucyB7XG4gIHRpbWVvdXQ6IG51bWJlcjtcbiAgb25UaW1lb3V0PzogKCkgPT4gdm9pZDtcbn1cblxuZXhwb3J0IGNsYXNzIFdhaXRhYmxlRXZlbnQge1xuICBwcml2YXRlIF9wcm9taXNlPzogUHJvbWlzZTx2b2lkPjtcbiAgcHJpdmF0ZSBfcmVzb2x2ZT86ICgpID0+IHZvaWQ7XG4gIHByaXZhdGUgX3RpbWVvdXRUb2tlbj86IE5vZGVKUy5UaW1lb3V0O1xuXG4gIHdhaXQob3B0aW9ucz86IFdhaXRPcHRpb25zKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKHRoaXMuX3Byb21pc2UpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcImFscmVhZHkgd2FpdGluZ1wiKTtcbiAgICB9XG4gICAgdGhpcy5fcHJvbWlzZSA9IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICB0aGlzLl9yZXNvbHZlID0gcmVzb2x2ZTtcbiAgICAgIGlmIChvcHRpb25zPy50aW1lb3V0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhpcy5fdGltZW91dFRva2VuID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgb3B0aW9ucy5vblRpbWVvdXQ/LigpO1xuICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgfSwgb3B0aW9ucy50aW1lb3V0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gdGhpcy5fcHJvbWlzZTtcbiAgfVxuXG4gIHNpZ25hbCgpIHtcbiAgICBjbGVhclRpbWVvdXQodGhpcy5fdGltZW91dFRva2VuKTtcbiAgICB0aGlzLl9wcm9taXNlID0gdW5kZWZpbmVkO1xuICAgIHRoaXMuX3Jlc29sdmU/LigpO1xuICB9XG59XG4iLCIvLyBDcmVhdGVkIGJ5IEF1dG9rYWthIChxcTE5MDk2OTg0OTRAZ21haWwuY29tKSBvbiAyMDI2LzAyLzA5LlxuXG5pbXBvcnQgeyBCcm93c2VyV2luZG93IH0gZnJvbSBcImVsZWN0cm9uXCI7XG5pbXBvcnQgeyBVUkwgfSBmcm9tIFwidXJsXCI7XG5pbXBvcnQgeyBDb25jdXJyZW5jeUxpbWl0ZXIgfSBmcm9tIFwiLi4vYmFzZS9saW1pdGVyXCI7XG5pbXBvcnQgeyBsb2dnZXIgfSBmcm9tIFwiLi4vYmFzZS9sb2dnaW5nXCI7XG5pbXBvcnQgeyBXYWl0YWJsZUV2ZW50IH0gZnJvbSBcIi4uL2Jhc2Uvd2FpdGFibGVfZXZlbnRcIjtcblxuY29uc3QgVEFHID0gXCJbTmV0d29ya11cIjtcblxuY29uc3QgbWFwID0gbmV3IE1hcChbXG4gIFtganNzei1ib3NzLmhkc2xiLmNvbWAsIGBqc3N6LWJvc3MuYmlsaWJpbGkuY29gXSwgLy9cbiAgW2Bib3NzLmhkc2xiLmNvbWAsIGBzaGpkLWJvc3MuYmlsaWJpbGkuY29gXSxcbl0pO1xuXG5leHBvcnQgZnVuY3Rpb24gcHJveGllZFVybCh1cmw6IHN0cmluZykge1xuICBpZiAoIXVybC5zdGFydHNXaXRoKFwiaHR0cFwiKSkge1xuICAgIHJldHVybiB1cmw7XG4gIH1cbiAgY29uc3QgcGFyc2VkID0gbmV3IFVSTCh1cmwpO1xuICBjb25zdCB0YXJnZXQgPSBtYXAuZ2V0KHBhcnNlZC5ob3N0bmFtZSk7XG4gIGlmICghdGFyZ2V0KSB7XG4gICAgcmV0dXJuIHVybDtcbiAgfVxuICBwYXJzZWQuaG9zdG5hbWUgPSB0YXJnZXQ7XG4gIHBhcnNlZC5wcm90b2NvbCA9IFwiaHR0cDpcIjtcbiAgcmV0dXJuIHBhcnNlZC50b1N0cmluZygpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE5ldHdvcmtPcHRpb25zIHtcbiAgc291cmNlOiBzdHJpbmc7XG4gIHdpbmRvdzogQnJvd3NlcldpbmRvdztcbiAgdXNlSW5uZXJQcm94eT86IGJvb2xlYW47XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXRJbnRlcmNlcHRvcih7IHNvdXJjZSwgd2luZG93LCB1c2VJbm5lclByb3h5IH06IE5ldHdvcmtPcHRpb25zKSB7XG4gIGNvbnN0IHJlcSA9IHdpbmRvdy53ZWJDb250ZW50cy5zZXNzaW9uLndlYlJlcXVlc3Q7XG4gIGNvbnN0IGxpbWl0ZXIgPSBuZXcgQ29uY3VycmVuY3lMaW1pdGVyKDY0KTtcbiAgY29uc3QgZXZlbnRzID0gbmV3IE1hcDxzdHJpbmcsIFdhaXRhYmxlRXZlbnQ+KCk7XG5cbiAgYXN5bmMgZnVuY3Rpb24gd2FpdChrZXk6IHN0cmluZywgb25UaW1lb3V0PzogKCkgPT4gdm9pZCkge1xuICAgIGNvbnN0IGV2ZW50ID0gbmV3IFdhaXRhYmxlRXZlbnQoKTtcbiAgICBldmVudHMuc2V0KGtleSwgZXZlbnQpO1xuICAgIGF3YWl0IGV2ZW50LndhaXQoeyB0aW1lb3V0OiA1XzAwMCwgb25UaW1lb3V0IH0pLmZpbmFsbHkoKCkgPT4gZXZlbnRzLmRlbGV0ZShrZXkpKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNpZ25hbChrZXk6IHN0cmluZykge1xuICAgIGV2ZW50cy5nZXQoa2V5KT8uc2lnbmFsKCk7XG4gIH1cblxuICByZXEub25CZWZvcmVSZXF1ZXN0KChkZXRhaWxzLCBjYWxsYmFjaykgPT4ge1xuICAgIGNvbnN0IHVybCA9IGRldGFpbHMudXJsO1xuICAgIGNvbnN0IHByb3hpZWQgPSB1c2VJbm5lclByb3h5ID8gcHJveGllZFVybCh1cmwpIDogdXJsO1xuICAgIGxpbWl0ZXIuc2NoZWR1bGUoKCkgPT4ge1xuICAgICAgY29uc3Qga2V5ID0gYCR7d2luZG93LmlkfV8ke2RldGFpbHMuaWR9YDtcbiAgICAgIGxvZ2dlci5kZWJ1ZyhUQUcsIGBzdGFydDpgLCB7XG4gICAgICAgIGtleSxcbiAgICAgICAgdXJsLFxuICAgICAgICBwcm94aWVkLFxuICAgICAgICBtZXRob2Q6IGRldGFpbHMubWV0aG9kLFxuICAgICAgICBzb3VyY2UsXG4gICAgICAgIHN0YXRzOiBsaW1pdGVyLnN0YXRzLFxuICAgICAgfSk7XG4gICAgICBpZiAocHJveGllZCA9PT0gdXJsKSB7XG4gICAgICAgIGNhbGxiYWNrKHsgY2FuY2VsOiBmYWxzZSB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNhbGxiYWNrKHsgY2FuY2VsOiBmYWxzZSwgcmVkaXJlY3RVUkw6IHByb3hpZWQgfSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gd2FpdChrZXksICgpID0+IHtcbiAgICAgICAgbG9nZ2VyLndhcm4oVEFHLCBgbWF5YmUgdGltZW91dDpgLCB7XG4gICAgICAgICAga2V5LFxuICAgICAgICAgIHVybCxcbiAgICAgICAgICBwcm94aWVkLFxuICAgICAgICAgIG1ldGhvZDogZGV0YWlscy5tZXRob2QsXG4gICAgICAgICAgc291cmNlLFxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICByZXEub25IZWFkZXJzUmVjZWl2ZWQoKHsgcmVzcG9uc2VIZWFkZXJzIH0sIGNhbGxiYWNrKSA9PiB7XG4gICAgZGVsZXRlIHJlc3BvbnNlSGVhZGVycz8uW1wieC1mcmFtZS1vcHRpb25zXCJdO1xuICAgIGRlbGV0ZSByZXNwb25zZUhlYWRlcnM/LltcIlgtRnJhbWUtT3B0aW9uc1wiXTtcbiAgICBkZWxldGUgcmVzcG9uc2VIZWFkZXJzPy5bXCJjb250ZW50LXNlY3VyaXR5LXBvbGljeVwiXTtcbiAgICBkZWxldGUgcmVzcG9uc2VIZWFkZXJzPy5bXCJDb250ZW50LVNlY3VyaXR5LVBvbGljeVwiXTtcbiAgICBjYWxsYmFjayh7IGNhbmNlbDogZmFsc2UsIHJlc3BvbnNlSGVhZGVycyB9KTtcbiAgfSk7XG5cbiAgcmVxLm9uQ29tcGxldGVkKChkZXRhaWxzKSA9PiB7XG4gICAgY29uc3Qga2V5ID0gYCR7d2luZG93LmlkfV8ke2RldGFpbHMuaWR9YDtcbiAgICBzaWduYWwoa2V5KTtcbiAgICBsb2dnZXIuZGVidWcoVEFHLCBgY29tcGxldGVkOmAsIHtcbiAgICAgIGtleSxcbiAgICAgIHVybDogZGV0YWlscy51cmwsXG4gICAgICBtZXRob2Q6IGRldGFpbHMubWV0aG9kLFxuICAgICAgc3RhdHVzQ29kZTogZGV0YWlscy5zdGF0dXNDb2RlLFxuICAgICAgc291cmNlLFxuICAgIH0pO1xuICB9KTtcblxuICByZXEub25FcnJvck9jY3VycmVkKChkZXRhaWxzKSA9PiB7XG4gICAgY29uc3Qga2V5ID0gYCR7d2luZG93LmlkfV8ke2RldGFpbHMuaWR9YDtcbiAgICBzaWduYWwoa2V5KTtcbiAgICBsb2dnZXIuZXJyb3IoVEFHLCBgZXJyb3I6YCwge1xuICAgICAga2V5LFxuICAgICAgdXJsOiBkZXRhaWxzLnVybCxcbiAgICAgIG1ldGhvZDogZGV0YWlscy5tZXRob2QsXG4gICAgICBlcnJvcjogZGV0YWlscy5lcnJvcixcbiAgICAgIHNvdXJjZSxcbiAgICB9KTtcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB1bnNldEludGVyY2VwdG9yKHdpbmRvdzogQnJvd3NlcldpbmRvdykge1xuICBjb25zdCByZXEgPSB3aW5kb3cud2ViQ29udGVudHMuc2Vzc2lvbi53ZWJSZXF1ZXN0O1xuICByZXEub25CZWZvcmVSZXF1ZXN0KG51bGwpO1xuICByZXEub25IZWFkZXJzUmVjZWl2ZWQobnVsbCk7XG4gIHJlcS5vbkNvbXBsZXRlZChudWxsKTtcbiAgcmVxLm9uRXJyb3JPY2N1cnJlZChudWxsKTtcbn1cbiIsIi8vIENyZWF0ZWQgYnkgQXV0b2tha2EgKHFxMTkwOTY5ODQ5NEBnbWFpbC5jb20pIG9uIDIwMjYvMDIvMjcuXG5cbmltcG9ydCB7IEJyb3dzZXJXaW5kb3cgfSBmcm9tIFwiZWxlY3Ryb25cIjtcbmltcG9ydCB7IGxvZ2dlciB9IGZyb20gXCIuLi9iYXNlL2xvZ2dpbmdcIjtcbmltcG9ydCB7IHVzZVJldHJ5IH0gZnJvbSBcIi4uL2Jhc2UvcmV0cnlcIjtcbmltcG9ydCB7IGJ1aWxkV3JhcHBlckhUTUwgfSBmcm9tIFwiLi9mcmFtZV9zeW5jXCI7XG5pbXBvcnQgeyBjaGVja0hUTUwgfSBmcm9tIFwiLi9odG1sX2NoZWNrXCI7XG5pbXBvcnQgeyBwcm94aWVkVXJsLCBzZXRJbnRlcmNlcHRvciwgdW5zZXRJbnRlcmNlcHRvciB9IGZyb20gXCIuL25ldHdvcmtcIjtcbmltcG9ydCB0eXBlIHsgUmVuZGVyT3B0aW9ucyB9IGZyb20gXCIuL3NjaGVtYVwiO1xuXG5jb25zdCBUQUcgPSBcIltXaW5kb3ddXCI7XG5cbmZ1bmN0aW9uIHdhaXRGb3JGaW5pc2god2luOiBCcm93c2VyV2luZG93LCBhY3Rpb246ICgpID0+IHZvaWQpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjb25zdCB0aW1lb3V0ID0gc2V0VGltZW91dCgoKSA9PiByZWplY3QobmV3IEVycm9yKFwibG9hZCB3aW5kb3cgdGltZW91dFwiKSksIDMwXzAwMCk7XG4gICAgY29uc3QgZG9uZSA9IChlcnI/OiBFcnJvcikgPT4ge1xuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgZXJyID8gcmVqZWN0KGVycikgOiByZXNvbHZlKCk7XG4gICAgfTtcbiAgICB3aW4ud2ViQ29udGVudHMub25jZShcImRpZC1maW5pc2gtbG9hZFwiLCAoKSA9PiBkb25lKCkpO1xuICAgIHdpbi53ZWJDb250ZW50cy5vbmNlKFwiZGlkLWZhaWwtbG9hZFwiLCAoX2UsIGNvZGUsIGRlc2MsIHVybCkgPT5cbiAgICAgIGRvbmUobmV3IEVycm9yKGBmYWlsZWQgdG8gbG9hZCAke3VybH06IFske2NvZGV9XSAke2Rlc2N9YCkpLFxuICAgICk7XG4gICAgd2luLndlYkNvbnRlbnRzLm9uY2UoXCJyZW5kZXItcHJvY2Vzcy1nb25lXCIsIChfZSwgeyBleGl0Q29kZSwgcmVhc29uIH0pID0+XG4gICAgICBkb25lKG5ldyBFcnJvcihgcmVuZGVyZXIgY3Jhc2hlZDogJHtleGl0Q29kZX0sICR7cmVhc29ufWApKSxcbiAgICApO1xuICAgIGFjdGlvbigpO1xuICB9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gb3BlbldpbmRvdyh3aW5zOiBCcm93c2VyV2luZG93W10sIHNvdXJjZTogc3RyaW5nLCBvcHRpb25zOiBSZW5kZXJPcHRpb25zKTogUHJvbWlzZTxCcm93c2VyV2luZG93PiB7XG4gIGNoZWNrSFRNTChzb3VyY2UpO1xuXG4gIGNvbnN0IHsgd2lkdGgsIGhlaWdodCwgdXNlSW5uZXJQcm94eSB9ID0gb3B0aW9ucztcblxuICBsZXQgc3JjID0gc291cmNlO1xuICBpZiAodXNlSW5uZXJQcm94eSkge1xuICAgIHNyYyA9IHByb3hpZWRVcmwoc291cmNlKTtcbiAgfVxuXG4gIHdpbnMuZm9yRWFjaCgodykgPT4ge1xuICAgIHcud2ViQ29udGVudHMucmVtb3ZlQWxsTGlzdGVuZXJzKCk7XG4gICAgdW5zZXRJbnRlcmNlcHRvcih3KTtcbiAgICBsb2dnZXIuZGVidWcoVEFHLCBgZGVzdHJveSB3aW5kb3c6YCwgdy5pZCk7XG4gIH0pO1xuICBjb25zdCB3aW4gPSBuZXcgQnJvd3NlcldpbmRvdyh7XG4gICAgd2lkdGgsXG4gICAgaGVpZ2h0OiBoZWlnaHQgKyAxLFxuICAgIHNob3c6IGZhbHNlLFxuICAgIHRyYW5zcGFyZW50OiB0cnVlLFxuICAgIGJhY2tncm91bmRDb2xvcjogdW5kZWZpbmVkLFxuICAgIHdlYlByZWZlcmVuY2VzOiB7XG4gICAgICBvZmZzY3JlZW46IHRydWUsXG4gICAgICBiYWNrZ3JvdW5kVGhyb3R0bGluZzogZmFsc2UsXG4gICAgICBub2RlSW50ZWdyYXRpb246IHRydWUsXG4gICAgICBub2RlSW50ZWdyYXRpb25JblN1YkZyYW1lczogdHJ1ZSxcbiAgICAgIG5vZGVJbnRlZ3JhdGlvbkluV29ya2VyOiB0cnVlLFxuICAgICAgY29udGV4dElzb2xhdGlvbjogZmFsc2UsXG4gICAgICB3ZWJTZWN1cml0eTogZmFsc2UsXG4gICAgICBhbGxvd1J1bm5pbmdJbnNlY3VyZUNvbnRlbnQ6IHRydWUsXG4gICAgICBleHBlcmltZW50YWxGZWF0dXJlczogdHJ1ZSxcbiAgICB9LFxuICB9KTtcbiAgc2V0SW50ZXJjZXB0b3IoeyBzb3VyY2UsIHdpbmRvdzogd2luLCB1c2VJbm5lclByb3h5IH0pO1xuICB3aW5zLnNwbGljZSgwKS5mb3JFYWNoKCh3KSA9PiB3LmRlc3Ryb3koKSk7XG4gIHdpbnMucHVzaCh3aW4pO1xuXG4gIHdpbi53ZWJDb250ZW50cy5vbihcImNvbnNvbGUtbWVzc2FnZVwiLCAoeyBsZXZlbCwgbWVzc2FnZSwgbGluZU51bWJlciwgc291cmNlSWQgfSkgPT4ge1xuICAgIGlmIChsZXZlbCA9PT0gXCJlcnJvclwiKSB7XG4gICAgICBsb2dnZXIuZXJyb3IoVEFHLCBcImNvbnNvbGU6XCIsIHtcbiAgICAgICAgbWVzc2FnZSxcbiAgICAgICAgbGluZU51bWJlcixcbiAgICAgICAgc291cmNlSWQsXG4gICAgICAgIHNvdXJjZSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG5cbiAgY29uc3Qgd3JhcHBlckhUTUwgPSBidWlsZFdyYXBwZXJIVE1MKHNyYywgeyB3aWR0aCwgaGVpZ2h0IH0pO1xuICBjb25zdCBkYXRhVVJMID0gYGRhdGE6dGV4dC9odG1sO2NoYXJzZXQ9dXRmLTgsJHtlbmNvZGVVUklDb21wb25lbnQod3JhcHBlckhUTUwpfWA7XG4gIGF3YWl0IHdhaXRGb3JGaW5pc2god2luLCAoKSA9PiB3aW4ubG9hZFVSTChkYXRhVVJMKSk7XG5cbiAgcmV0dXJuIHdpbjtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvYWRXaW5kb3coc291cmNlOiBzdHJpbmcsIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMpOiBQcm9taXNlPEJyb3dzZXJXaW5kb3c+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCB3aW5zOiBCcm93c2VyV2luZG93W10gPSBbXTtcbiAgICBhd2FpdCB1c2VSZXRyeSh7IGZuOiBvcGVuV2luZG93LCBtYXhBdHRlbXB0czogMiB9KSh3aW5zLCBzb3VyY2UsIG9wdGlvbnMpO1xuICAgIHJldHVybiBhd2FpdCBvcGVuV2luZG93KHdpbnMsIHNvdXJjZSwgb3B0aW9ucyk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjb25zdCB7IG1lc3NhZ2UsIHN0YWNrIH0gPSBlIGFzIEVycm9yO1xuICAgIGNvbnN0IGRlc2MgPSB7IHNvdXJjZSwgbWVzc2FnZSwgc3RhY2sgfTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYGZhaWxlZCB0byBsb2FkIHdpbmRvdzogJHtKU09OLnN0cmluZ2lmeShkZXNjKX1gKTtcbiAgfVxufVxuIiwiLy8gQ3JlYXRlZCBieSBBdXRva2FrYSAocXExOTA5Njk4NDk0QGdtYWlsLmNvbSkgb24gMjAyNi8wMi8wOS5cblxuaW1wb3J0IHsgb2sgfSBmcm9tIFwiYXNzZXJ0XCI7XG5pbXBvcnQgeyBuYXRpdmVJbWFnZSwgdHlwZSBOYXRpdmVJbWFnZSB9IGZyb20gXCJlbGVjdHJvblwiO1xuaW1wb3J0IHsgbWtkaXIsIHdyaXRlRmlsZSB9IGZyb20gXCJmcy9wcm9taXNlc1wiO1xuaW1wb3J0IHsgam9pbiB9IGZyb20gXCJwYXRoXCI7XG5pbXBvcnQgeyBFbmNvZGVyUGlwZWxpbmUgfSBmcm9tIFwiLi4vYmFzZS9lbmNvZGVyL2VuY29kZXJcIjtcbmltcG9ydCB7IGlzRW1wdHkgfSBmcm9tIFwiLi4vYmFzZS9pbWFnZVwiO1xuaW1wb3J0IHsgQ29uY3VycmVuY3lMaW1pdGVyIH0gZnJvbSBcIi4uL2Jhc2UvbGltaXRlclwiO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSBcIi4uL2Jhc2UvbG9nZ2luZ1wiO1xuaW1wb3J0IHsgc2V0dXBBdWRpb0NhcHR1cmUgfSBmcm9tIFwiLi9hdWRpb19jYXB0dXJlXCI7XG5pbXBvcnQgeyBkZWNvZGVUaW1lc3RhbXAsIHN0YXJ0U3luYywgc3RvcFN5bmMgfSBmcm9tIFwiLi9mcmFtZV9zeW5jXCI7XG5pbXBvcnQgdHlwZSB7IFJlbmRlck9wdGlvbnMsIFJlbmRlclJlc3VsdCB9IGZyb20gXCIuL3NjaGVtYVwiO1xuaW1wb3J0IHsgbG9hZFdpbmRvdyB9IGZyb20gXCIuL3dpbmRvd1wiO1xuXG5jb25zdCBUQUcgPSBcIltSZW5kZXJdXCI7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZW5kZXIoc291cmNlOiBzdHJpbmcsIG9wdGlvbnM6IFJlbmRlck9wdGlvbnMpOiBQcm9taXNlPHZvaWQ+IHtcbiAgbG9nZ2VyLmluZm8oVEFHLCBgcHJvZ3Jlc3M6IDAlYCk7XG4gIGNvbnN0IHsgb3V0RGlyLCBmcHMsIHdpZHRoLCBoZWlnaHQsIGR1cmF0aW9uLCB3aXRoQXVkaW8sIGZvcm1hdHMgfSA9IG9wdGlvbnM7XG5cbiAgYXdhaXQgbWtkaXIob3V0RGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcblxuICBjb25zdCBwaXBlbGluZSA9IGF3YWl0IEVuY29kZXJQaXBlbGluZS5jcmVhdGUoeyB3aWR0aCwgaGVpZ2h0LCBmcHMsIGZvcm1hdHMsIG91dERpciwgd2l0aEF1ZGlvIH0pO1xuICBjb25zdCBhdWRpb0NhcHR1cmUgPSB3aXRoQXVkaW8gPyBhd2FpdCBzZXR1cEF1ZGlvQ2FwdHVyZShwaXBlbGluZSkgOiB1bmRlZmluZWQ7XG5cbiAgY29uc3Qgd2luID0gYXdhaXQgbG9hZFdpbmRvdyhzb3VyY2UsIG9wdGlvbnMpO1xuICB0cnkge1xuICAgIGNvbnN0IGNkcCA9IHdpbi53ZWJDb250ZW50cy5kZWJ1Z2dlcjtcbiAgICBjZHAuYXR0YWNoKFwiMS4zXCIpO1xuXG4gICAgd2luLndlYkNvbnRlbnRzLnNldEZyYW1lUmF0ZShmcHMpO1xuICAgIGlmICghd2luLndlYkNvbnRlbnRzLmlzUGFpbnRpbmcoKSkge1xuICAgICAgd2luLndlYkNvbnRlbnRzLnN0YXJ0UGFpbnRpbmcoKTtcbiAgICB9XG5cbiAgICBjb25zdCB0b3RhbCA9IE1hdGguY2VpbChmcHMgKiBkdXJhdGlvbik7XG4gICAgY29uc3QgZnJhbWVJbnRlcnZhbCA9IDEwMDAgLyBmcHM7XG5cbiAgICBsZXQgd3JpdHRlbiA9IDA7XG4gICAgbGV0IGxhc3RXcml0dGVuVGltZTogbnVtYmVyIHwgdW5kZWZpbmVkO1xuICAgIGxldCBwcm9ncmVzcyA9IDA7XG4gICAgbGV0IGZyYW1lRXJyb3I6IEVycm9yIHwgdW5kZWZpbmVkO1xuICAgIGxldCByZXNvbHZlcjogKCgpID0+IHZvaWQpIHwgdW5kZWZpbmVkO1xuICAgIGxldCByZWplY3RlcjogKChyZWFzb24/OiB1bmtub3duKSA9PiB2b2lkKSB8IHVuZGVmaW5lZDtcbiAgICBsZXQgY292ZXJCZ3JhOiBCdWZmZXIgfCB1bmRlZmluZWQ7XG4gICAgY29uc3QgZW5jb2RlUXVldWUgPSBuZXcgQ29uY3VycmVuY3lMaW1pdGVyKDEpO1xuXG4gICAgY29uc3Qgc2NoZWR1bGVGcmFtZSA9IChmcmFtZTogQnVmZmVyLCB0aW1lc3RhbXBVczogbnVtYmVyKSA9PiB7XG4gICAgICB3cml0dGVuKys7XG4gICAgICBjb25zdCB0MCA9IHBlcmZvcm1hbmNlLm5vdygpO1xuICAgICAgZW5jb2RlUXVldWUgLy9cbiAgICAgICAgLnNjaGVkdWxlKCgpID0+IHBpcGVsaW5lLmVuY29kZUZyYW1lKGZyYW1lLCB0aW1lc3RhbXBVcykpXG4gICAgICAgIC5jYXRjaCgoZSkgPT4gKGZyYW1lRXJyb3IgPz89IGUpKTtcbiAgICAgIGNvbnN0IGRpZmYgPSBwZXJmb3JtYW5jZS5ub3coKSAtIHQwO1xuICAgICAgaWYgKGRpZmYgPiBmcmFtZUludGVydmFsICogMS4yKSB7XG4gICAgICAgIGxvZ2dlci53YXJuKFRBRywgYGZyYW1lIHN0YWxsZWQgaW4gJHtkaWZmfW1zYCk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHBhaW50ID0gKF9lOiB1bmtub3duLCBfcjogdW5rbm93biwgaW1hZ2U6IE5hdGl2ZUltYWdlKSA9PiB7XG4gICAgICBpZiAoZnJhbWVFcnJvcikge1xuICAgICAgICByZWplY3Rlcj8uKGZyYW1lRXJyb3IpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChpc0VtcHR5KGltYWdlKSkgcmV0dXJuO1xuXG4gICAgICBjb25zdCBiaXRtYXAgPSBpbWFnZS50b0JpdG1hcCgpO1xuICAgICAgY29uc3QgY3VycmVudFRpbWUgPSBkZWNvZGVUaW1lc3RhbXAoYml0bWFwLCBpbWFnZS5nZXRTaXplKCkpO1xuICAgICAgaWYgKGN1cnJlbnRUaW1lID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgZnJhbWVFcnJvciA/Pz0gbmV3IEVycm9yKGBubyB0aW1lc3RhbXAgQCAke3dyaXR0ZW59YCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgY29uc3QgYnl0ZXNQZXJSb3cgPSB3aWR0aCAqIDQ7XG4gICAgICBjb25zdCBjcm9wcGVkID0gQnVmZmVyLmZyb20oYml0bWFwLmJ1ZmZlciwgYml0bWFwLmJ5dGVPZmZzZXQsIGhlaWdodCAqIGJ5dGVzUGVyUm93KTtcblxuICAgICAgY292ZXJCZ3JhID8/PSBjcm9wcGVkO1xuXG4gICAgICBpZiAobGFzdFdyaXR0ZW5UaW1lID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgc2NoZWR1bGVGcmFtZShjcm9wcGVkLCBjdXJyZW50VGltZSAqIDEwMDApO1xuICAgICAgICBsYXN0V3JpdHRlblRpbWUgPSBjdXJyZW50VGltZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnN0IHRpbWVEZWx0YSA9IGN1cnJlbnRUaW1lIC0gbGFzdFdyaXR0ZW5UaW1lO1xuICAgICAgICBpZiAodGltZURlbHRhID49IGZyYW1lSW50ZXJ2YWwgKiAwLjgpIHtcbiAgICAgICAgICBpZiAodGltZURlbHRhIDw9IGZyYW1lSW50ZXJ2YWwgKiAxLjIpIHtcbiAgICAgICAgICAgIHNjaGVkdWxlRnJhbWUoY3JvcHBlZCwgY3VycmVudFRpbWUgKiAxMDAwKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgZnJhbWVzVG9JbnNlcnQgPSBNYXRoLnJvdW5kKHRpbWVEZWx0YSAvIGZyYW1lSW50ZXJ2YWwpO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBmcmFtZXNUb0luc2VydCAmJiB3cml0dGVuIDwgdG90YWw7IGkrKykge1xuICAgICAgICAgICAgICBzY2hlZHVsZUZyYW1lKGNyb3BwZWQsIE1hdGgucm91bmQoKGxhc3RXcml0dGVuVGltZSArIChpICsgMSkgKiBmcmFtZUludGVydmFsKSAqIDEwMDApKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgbGFzdFdyaXR0ZW5UaW1lID0gY3VycmVudFRpbWU7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY29uc3QgbmV3UHJvZ3Jlc3MgPSBNYXRoLmZsb29yKCh3cml0dGVuIC8gdG90YWwpICogMTAwKTtcbiAgICAgIGlmIChNYXRoLmFicyhuZXdQcm9ncmVzcyAtIHByb2dyZXNzKSA+IDEwKSB7XG4gICAgICAgIHByb2dyZXNzID0gbmV3UHJvZ3Jlc3M7XG4gICAgICAgIGxvZ2dlci5pbmZvKFRBRywgYHByb2dyZXNzOiAke01hdGgucm91bmQocHJvZ3Jlc3MpfSVgKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgZHVyYXRpb25NcyA9IGR1cmF0aW9uICogMTAwMDtcbiAgICAgIGlmIChjdXJyZW50VGltZSA+PSBkdXJhdGlvbk1zIC0gZnJhbWVJbnRlcnZhbCAqIDAuNSB8fCB3cml0dGVuID49IHRvdGFsKSB7XG4gICAgICAgIHJlc29sdmVyPy4oKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgd2luLndlYkNvbnRlbnRzLm9uKFwicGFpbnRcIiwgcGFpbnQpO1xuICAgIGF3YWl0IHN0YXJ0U3luYyhjZHApO1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZTx2b2lkPigociwgaikgPT4gKFtyZXNvbHZlciwgcmVqZWN0ZXJdID0gW3IsIGpdKSk7XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGF3YWl0IHN0b3BTeW5jKGNkcCk7XG4gICAgICB3aW4ud2ViQ29udGVudHMub2ZmKFwicGFpbnRcIiwgcGFpbnQpO1xuICAgICAgYXdhaXQgYXVkaW9DYXB0dXJlPy50ZWFyZG93bigpO1xuICAgIH1cblxuICAgIGlmIChmcmFtZUVycm9yIHx8IHdyaXR0ZW4gPT09IDApIHtcbiAgICAgIHRocm93IGZyYW1lRXJyb3IgPz8gbmV3IEVycm9yKFwibm8gZnJhbWVzIGNhcHR1cmVkXCIpO1xuICAgIH1cblxuICAgIGF3YWl0IGVuY29kZVF1ZXVlLmVuZCgpO1xuICAgIGNvbnN0IG91dHB1dEZpbGVzID0gYXdhaXQgcGlwZWxpbmUuZmluaXNoKCk7XG4gICAgY29uc3QgY292ZXJQYXRoID0gam9pbihvdXREaXIsIFwiY292ZXIucG5nXCIpO1xuICAgIG9rKGNvdmVyQmdyYSwgXCJjb3ZlciBpbWFnZSBpcyBtaXNzaW5nXCIpO1xuICAgIGNvbnN0IHBuZyA9IG5hdGl2ZUltYWdlLmNyZWF0ZUZyb21CdWZmZXIoY292ZXJCZ3JhLCB7IHdpZHRoLCBoZWlnaHQgfSkudG9QTkcoKTtcbiAgICBhd2FpdCB3cml0ZUZpbGUoY292ZXJQYXRoLCBwbmcpO1xuICAgIGNvbnN0IHJlc3VsdDogUmVuZGVyUmVzdWx0ID0ge1xuICAgICAgb3B0aW9ucyxcbiAgICAgIHdyaXR0ZW4sXG4gICAgICBmaWxlczogeyAuLi5vdXRwdXRGaWxlcywgY292ZXI6IGNvdmVyUGF0aCB9LFxuICAgIH07XG4gICAgYXdhaXQgd3JpdGVGaWxlKGpvaW4ob3V0RGlyLCBcInN1bW1hcnkuanNvblwiKSwgSlNPTi5zdHJpbmdpZnkocmVzdWx0KSk7XG4gICAgbG9nZ2VyLmluZm8oVEFHLCBgcHJvZ3Jlc3M6IDEwMCUsICR7d3JpdHRlbn0gZnJhbWVzIHdyaXR0ZW5gKTtcbiAgfSBmaW5hbGx5IHtcbiAgICB3aW4uY2xvc2UoKTtcbiAgfVxufVxuIiwiLy8gQ3JlYXRlZCBieSBBdXRva2FrYSAocXExOTA5Njk4NDk0QGdtYWlsLmNvbSkgb24gMjAyNi8wMy8xMy5cblxuaW1wb3J0IHR5cGUgeyBEZWJ1Z2dlciB9IGZyb20gXCJlbGVjdHJvblwiO1xuXG5leHBvcnQgZnVuY3Rpb24gYWR2YW5jZVZpcnR1YWxUaW1lKGNkcDogRGVidWdnZXIsIGJ1ZGdldDogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgIGNvbnN0IGhhbmRsZXIgPSAoXzogRWxlY3Ryb24uRXZlbnQsIG1ldGhvZDogc3RyaW5nKSA9PiB7XG4gICAgICBpZiAobWV0aG9kID09PSBcIkVtdWxhdGlvbi52aXJ0dWFsVGltZUJ1ZGdldEV4cGlyZWRcIikge1xuICAgICAgICBjZHAub2ZmKFwibWVzc2FnZVwiLCBoYW5kbGVyKTtcbiAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgfVxuICAgIH07XG4gICAgY2RwLm9uKFwibWVzc2FnZVwiLCBoYW5kbGVyKTtcbiAgICBjZHAuc2VuZENvbW1hbmQoXCJFbXVsYXRpb24uc2V0VmlydHVhbFRpbWVQb2xpY3lcIiwge1xuICAgICAgcG9saWN5OiBcImFkdmFuY2VcIixcbiAgICAgIGJ1ZGdldCxcbiAgICB9KTtcbiAgfSk7XG59XG4iLCIvLyBDcmVhdGVkIGJ5IEF1dG9rYWthIChxcTE5MDk2OTg0OTRAZ21haWwuY29tKSBvbiAyMDI2LzAzLzEzLlxuXG5pbXBvcnQgeyBvayB9IGZyb20gXCJhc3NlcnRcIjtcbmltcG9ydCB7IG5hdGl2ZUltYWdlLCB0eXBlIEJyb3dzZXJXaW5kb3csIHR5cGUgTmF0aXZlSW1hZ2UgfSBmcm9tIFwiZWxlY3Ryb25cIjtcbmltcG9ydCB7IG1rZGlyLCB3cml0ZUZpbGUgfSBmcm9tIFwiZnMvcHJvbWlzZXNcIjtcbmltcG9ydCB7IGpvaW4gfSBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHsgYWR2YW5jZVZpcnR1YWxUaW1lIH0gZnJvbSBcIi4uL2Jhc2UvY2RwXCI7XG5pbXBvcnQgeyBFbmNvZGVyUGlwZWxpbmUgfSBmcm9tIFwiLi4vYmFzZS9lbmNvZGVyL2VuY29kZXJcIjtcbmltcG9ydCB7IGlzRW1wdHkgfSBmcm9tIFwiLi4vYmFzZS9pbWFnZVwiO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSBcIi4uL2Jhc2UvbG9nZ2luZ1wiO1xuaW1wb3J0IHsgZGVjb2RlVGltZXN0YW1wLCBzdGFydFN5bmMsIHN0b3BTeW5jIH0gZnJvbSBcIi4vZnJhbWVfc3luY1wiO1xuaW1wb3J0IHR5cGUgeyBSZW5kZXJPcHRpb25zLCBSZW5kZXJSZXN1bHQgfSBmcm9tIFwiLi9zY2hlbWFcIjtcbmltcG9ydCB7IGxvYWRXaW5kb3cgfSBmcm9tIFwiLi93aW5kb3dcIjtcblxuY29uc3QgVEFHID0gXCJbU2hvb3RdXCI7XG5cbmZ1bmN0aW9uIHRpY2tBbmltcyh0aWNrOiBudW1iZXIpIHtcbiAgcmV0dXJuIGBkb2N1bWVudC5nZXRBbmltYXRpb25zKCkuZm9yRWFjaCgoYSkgPT4ge1xuICAgIGEucGF1c2UoKTtcbiAgICBhLmN1cnJlbnRUaW1lICs9ICR7dGlja307XG4gIH0pYDtcbn1cblxuZnVuY3Rpb24gYXdhaXRTdGVnb0ZyYW1lKFxuICB3aW46IEJyb3dzZXJXaW5kb3csXG4gIHdpZHRoOiBudW1iZXIsXG4gIGhlaWdodDogbnVtYmVyLFxuICBhZnRlclRzOiBudW1iZXIsXG4gIGZyYW1lSW5kZXg6IG51bWJlcixcbik6IFByb21pc2U8QnVmZmVyPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY29uc3QgdGltZW91dCA9IHNldFRpbWVvdXQoKCkgPT4gcmVqZWN0KG5ldyBFcnJvcihgZnJhbWUgJHtmcmFtZUluZGV4fSBwYWludCB0aW1lb3V0YCkpLCAxXzAwMCk7XG4gICAgY29uc3QgaGFuZGxlciA9IChfZTogdW5rbm93biwgX2Q6IHVua25vd24sIGltYWdlOiBOYXRpdmVJbWFnZSkgPT4ge1xuICAgICAgaWYgKGlzRW1wdHkoaW1hZ2UpKSByZXR1cm47XG4gICAgICBjb25zdCBiaXRtYXAgPSBpbWFnZS50b0JpdG1hcCgpO1xuICAgICAgY29uc3QgdHMgPSBkZWNvZGVUaW1lc3RhbXAoYml0bWFwLCBpbWFnZS5nZXRTaXplKCkpO1xuICAgICAgaWYgKHRzID09PSB1bmRlZmluZWQgfHwgdHMgPD0gYWZ0ZXJUcykgcmV0dXJuO1xuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXQpO1xuICAgICAgd2luLndlYkNvbnRlbnRzLm9mZihcInBhaW50XCIsIGhhbmRsZXIpO1xuICAgICAgcmVzb2x2ZShCdWZmZXIuZnJvbShiaXRtYXAuYnVmZmVyLCBiaXRtYXAuYnl0ZU9mZnNldCwgaGVpZ2h0ICogd2lkdGggKiA0KSk7XG4gICAgfTtcbiAgICB3aW4ud2ViQ29udGVudHMub24oXCJwYWludFwiLCBoYW5kbGVyKTtcbiAgfSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzaG9vdChzb3VyY2U6IHN0cmluZywgb3B0aW9uczogUmVuZGVyT3B0aW9ucyk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCB7IG91dERpciwgZnBzLCB3aWR0aCwgaGVpZ2h0LCBkdXJhdGlvbiwgd2l0aEF1ZGlvLCBmb3JtYXRzIH0gPSBvcHRpb25zO1xuICBpZiAod2l0aEF1ZGlvKSB7XG4gICAgbG9nZ2VyLndhcm4oVEFHLCBcIkF1ZGlvIGNhcHR1cmUgaXMgbm90IHN1cHBvcnRlZCBpbiBkZXRlcm1pbmlzdGljIG1vZGVcIik7XG4gIH1cblxuICBsb2dnZXIuaW5mbyhUQUcsIGBwcm9ncmVzczogMCVgKTtcbiAgYXdhaXQgbWtkaXIob3V0RGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcblxuICBjb25zdCB3aW4gPSBhd2FpdCBsb2FkV2luZG93KHNvdXJjZSwgb3B0aW9ucyk7XG4gIHRyeSB7XG4gICAgY29uc3QgY2RwID0gd2luLndlYkNvbnRlbnRzLmRlYnVnZ2VyO1xuICAgIGNkcC5hdHRhY2goXCIxLjNcIik7XG5cbiAgICB3aW4ud2ViQ29udGVudHMuc2V0RnJhbWVSYXRlKDI0MCk7XG4gICAgY29uc3Qgcm9vdEZyYW1lID0gd2luLndlYkNvbnRlbnRzLm1haW5GcmFtZS5mcmFtZXNbMF07XG4gICAgYXdhaXQgcm9vdEZyYW1lPy5leGVjdXRlSmF2YVNjcmlwdCh0aWNrQW5pbXMoMCkpO1xuXG4gICAgaWYgKCF3aW4ud2ViQ29udGVudHMuaXNQYWludGluZygpKSB7XG4gICAgICB3aW4ud2ViQ29udGVudHMuc3RhcnRQYWludGluZygpO1xuICAgIH1cblxuICAgIGF3YWl0IHN0YXJ0U3luYyhjZHApO1xuXG4gICAgY29uc3QgcGlwZWxpbmUgPSBhd2FpdCBFbmNvZGVyUGlwZWxpbmUuY3JlYXRlKHsgd2lkdGgsIGhlaWdodCwgZnBzLCBmb3JtYXRzLCBvdXREaXIsIHdpdGhBdWRpbyB9KTtcbiAgICBjb25zdCB0b3RhbCA9IE1hdGguY2VpbChmcHMgKiBkdXJhdGlvbik7XG4gICAgY29uc3QgZnJhbWVJbnRlcnZhbCA9IDEwMDAgLyBmcHM7XG4gICAgY29uc3QgZnJhbWVJbnRlcnZhbFVzID0gTWF0aC5yb3VuZCgxXzAwMF8wMDAgLyBmcHMpO1xuXG4gICAgbGV0IHdyaXR0ZW4gPSAwO1xuICAgIGxldCBwcm9ncmVzcyA9IDA7XG4gICAgbGV0IGNvdmVyQmdyYTogQnVmZmVyIHwgdW5kZWZpbmVkO1xuXG4gICAgdHJ5IHtcbiAgICAgIGZvciAobGV0IGZyYW1lID0gMDsgZnJhbWUgPCB0b3RhbDsgZnJhbWUrKykge1xuICAgICAgICBjb25zdCBmcmFtZU1zID0gKGZyYW1lICsgMSkgKiBmcmFtZUludGVydmFsO1xuICAgICAgICBjb25zdCBwZW5kaW5nID0gYXdhaXRTdGVnb0ZyYW1lKHdpbiwgd2lkdGgsIGhlaWdodCwgZnJhbWVNcyAtIDEsIGZyYW1lKTtcblxuICAgICAgICBhd2FpdCBhZHZhbmNlVmlydHVhbFRpbWUoY2RwLCBmcmFtZUludGVydmFsKTtcbiAgICAgICAgYXdhaXQgcm9vdEZyYW1lPy5leGVjdXRlSmF2YVNjcmlwdCh0aWNrQW5pbXMoZnJhbWVJbnRlcnZhbCkpO1xuXG4gICAgICAgIGNvbnN0IGJpdG1hcCA9IGF3YWl0IHBlbmRpbmc7XG5cbiAgICAgICAgaWYgKGZyYW1lID09PSAwKSB7XG4gICAgICAgICAgY292ZXJCZ3JhID0gYml0bWFwO1xuICAgICAgICB9XG5cbiAgICAgICAgYXdhaXQgcGlwZWxpbmUuZW5jb2RlRnJhbWUoYml0bWFwLCBmcmFtZSAqIGZyYW1lSW50ZXJ2YWxVcyk7XG4gICAgICAgIHdyaXR0ZW4rKztcblxuICAgICAgICBjb25zdCBuZXdQcm9ncmVzcyA9IE1hdGguZmxvb3IoKHdyaXR0ZW4gLyB0b3RhbCkgKiAxMDApO1xuICAgICAgICBpZiAoTWF0aC5hYnMobmV3UHJvZ3Jlc3MgLSBwcm9ncmVzcykgPiAxMCkge1xuICAgICAgICAgIHByb2dyZXNzID0gbmV3UHJvZ3Jlc3M7XG4gICAgICAgICAgbG9nZ2VyLmluZm8oVEFHLCBgcHJvZ3Jlc3M6ICR7TWF0aC5yb3VuZChwcm9ncmVzcyl9JWApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIGF3YWl0IHN0b3BTeW5jKGNkcCk7XG4gICAgICBjZHAuZGV0YWNoKCk7XG4gICAgfVxuXG4gICAgaWYgKHdyaXR0ZW4gPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIm5vIGZyYW1lcyBjYXB0dXJlZFwiKTtcbiAgICB9XG5cbiAgICBjb25zdCBvdXRwdXRGaWxlcyA9IGF3YWl0IHBpcGVsaW5lLmZpbmlzaCgpO1xuICAgIGNvbnN0IGNvdmVyUGF0aCA9IGpvaW4ob3V0RGlyLCBcImNvdmVyLnBuZ1wiKTtcbiAgICBvayhjb3ZlckJncmEsIFwiY292ZXIgaW1hZ2UgaXMgbWlzc2luZ1wiKTtcbiAgICBjb25zdCBwbmcgPSBuYXRpdmVJbWFnZS5jcmVhdGVGcm9tQnVmZmVyKGNvdmVyQmdyYSwgeyB3aWR0aCwgaGVpZ2h0IH0pLnRvUE5HKCk7XG4gICAgYXdhaXQgd3JpdGVGaWxlKGNvdmVyUGF0aCwgcG5nKTtcbiAgICBjb25zdCByZXN1bHQ6IFJlbmRlclJlc3VsdCA9IHtcbiAgICAgIG9wdGlvbnMsXG4gICAgICB3cml0dGVuLFxuICAgICAgZmlsZXM6IHsgLi4ub3V0cHV0RmlsZXMsIGNvdmVyOiBjb3ZlclBhdGggfSxcbiAgICB9O1xuICAgIGF3YWl0IHdyaXRlRmlsZShqb2luKG91dERpciwgXCJzdW1tYXJ5Lmpzb25cIiksIEpTT04uc3RyaW5naWZ5KHJlc3VsdCkpO1xuICAgIGxvZ2dlci5pbmZvKFRBRywgYHByb2dyZXNzOiAxMDAlLCAke3dyaXR0ZW59IGZyYW1lcyB3cml0dGVuYCk7XG4gIH0gZmluYWxseSB7XG4gICAgd2luLmNsb3NlKCk7XG4gIH1cbn1cbiIsIi8vIENyZWF0ZWQgYnkgQXV0b2tha2EgKHFxMTkwOTY5ODQ5NEBnbWFpbC5jb20pIG9uIDIwMjYvMDEvMzAuXG5cbmltcG9ydCB7IGFwcCB9IGZyb20gXCJlbGVjdHJvblwiO1xuaW1wb3J0IHsgbG9nZ2VyIH0gZnJvbSBcIi4vYmFzZS9sb2dnaW5nXCI7XG5pbXBvcnQgeyBtYWtlQ0xJIH0gZnJvbSBcIi4vY29tbW9uXCI7XG5pbXBvcnQgeyByZW5kZXIgfSBmcm9tIFwiLi9yZW5kZXJlci9yZW5kZXJcIjtcbmltcG9ydCB7IHNob290IH0gZnJvbSBcIi4vcmVuZGVyZXIvc2hvb3RcIjtcblxucHJvY2Vzcy5vbmNlKFwiZXhpdFwiLCAoKSA9PiBhcHAucXVpdCgpKTtcblxuY29uc3QgVEFHID0gXCJbQXBwXVwiO1xuXG5mdW5jdGlvbiBwcmludEZlYXR1cmVzKCkge1xuICBsb2dnZXIuZGVidWcoVEFHLCBcImdwdSBmZWF0dXJlczpcIiwgYXBwLmdldEdQVUZlYXR1cmVTdGF0dXMoKSk7XG59XG5cbmFwcC5kb2NrPy5oaWRlKCk7XG5cbm1ha2VDTEkoXCJhcHBcIiwgYXN5bmMgKHNvdXJjZSwgb3B0aW9ucykgPT4ge1xuICB0cnkge1xuICAgIGFwcC5vbihcImdwdS1pbmZvLXVwZGF0ZVwiLCBwcmludEZlYXR1cmVzKTtcbiAgICBhd2FpdCBhcHAud2hlblJlYWR5KCk7XG4gICAgcHJpbnRGZWF0dXJlcygpO1xuICAgIGNvbnN0IGFjdGlvbiA9IG9wdGlvbnMuZGV0ZXJtaW5pc3RpYyA/IHNob290IDogcmVuZGVyO1xuICAgIGF3YWl0IGFjdGlvbihzb3VyY2UsIG9wdGlvbnMpO1xuICB9IGZpbmFsbHkge1xuICAgIGFwcC5xdWl0KCk7XG4gIH1cbn0pO1xuIl19