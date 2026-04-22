// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/06.

import type { ChildProcess } from "child_process";
import { Log } from "node-av";
import { AV_LOG_ERROR, AV_LOG_WARNING } from "node-av/constants";
import { pupLogLevel } from "./constants";

export interface LoggerLike {
  debug?(this: void, ...messages: unknown[]): void;

  info?(this: void, ...messages: unknown[]): void;

  warn?(this: void, ...messages: unknown[]): void;

  error?(this: void, ...messages: unknown[]): void;
}

const DEBUG = "<pup@debug>";
const INFO = "<pup@info>";
const WARN = "<pup@warn>";
const ERROR = "<pup@error>";
const FATAL = "<pup@fatal>";

function stackHook(target: Function, _context: ClassMethodDecoratorContext) {
  return function (this: Logger, ...messages: unknown[]) {
    const processed = messages.map((msg) => {
      return msg instanceof Error ? (msg.stack ?? String(msg)) : msg;
    });
    return target.call(this, ...processed);
  };
}

export class Logger implements LoggerLike {
  private _impl?: LoggerLike;

  get level(): number {
    return this._level;
  }

  set level(value: number) {
    this._level = value;
    this.impl = this._impl ?? console;
  }

  get impl(): LoggerLike | undefined {
    return this._impl;
  }

  set impl(value: LoggerLike) {
    const debug = value.debug ?? console.debug;
    const info = value.info ?? console.info;
    const warn = value.warn ?? console.warn;
    const error = value.error ?? console.error;
    const lv = this._level;
    this._impl = {
      debug: lv >= 3 ? debug : undefined,
      info: lv >= 2 ? info : undefined,
      warn: lv >= 1 ? warn : undefined,
      error: lv >= 0 ? error : undefined,
    };
  }

  constructor(private _level: number = pupLogLevel) {
    this.impl = console;
  }

  @stackHook
  debug(...messages: unknown[]): void {
    this.impl?.debug?.(DEBUG, ...messages);
  }

  @stackHook
  info(...messages: unknown[]): void {
    this.impl?.info?.(INFO, ...messages);
  }

  @stackHook
  warn(...messages: unknown[]): void {
    this.impl?.warn?.(WARN, ...messages);
  }

  @stackHook
  error(...messages: unknown[]): void {
    this.impl?.error?.(ERROR, ...messages);
  }

  @stackHook
  fatal(...messages: unknown[]): void {
    this.impl?.error?.(FATAL, ...messages);
    process.exit(1);
  }

  private dispatch(message: string) {
    const msg = message.trimEnd();
    if (msg.startsWith(DEBUG)) {
      this.debug(msg.slice(DEBUG.length + 1));
    } else if (msg.startsWith(INFO)) {
      this.info(msg.slice(INFO.length + 1));
    } else if (msg.startsWith(WARN)) {
      this.warn(msg.slice(WARN.length + 1));
    } else if (msg.startsWith(ERROR)) {
      this.error(msg.slice(ERROR.length + 1));
    } else {
      this.info(msg);
    }
  }

  attach(proc: ChildProcess, name: string) {
    return new Promise<void>((resolve, reject) => {
      this.debug(`${name}.attach`);
      let fatal: string = "";
      const dispatch = (data: Buffer) => {
        const message = data.toString();
        if (message.startsWith(FATAL)) {
          fatal += message.slice(FATAL.length + 1);
        } else {
          this.dispatch(message);
        }
      };
      proc.stderr?.on("data", dispatch);
      proc.stdout?.on("data", dispatch);
      proc
        .on("error", (err) => {
          fatal += err.message;
          proc.kill();
        })
        .once("close", (code, signal) => {
          if (code || signal || fatal) {
            fatal ||= `command failed: ${proc.spawnargs.join(" ")}`;
            this.debug(`${name}.close`, { code, signal, fatal });
            reject(new Error(fatal));
          } else {
            this.debug(`${name}.close`);
            resolve();
          }
        })
        .on("unhandledRejection", (reason) => {
          this.error(`${name}.unhandled`, reason);
        })
        .on("uncaughtExceptionMonitor", (err) => {
          this.error(`${name}.unhandled`, err);
        });
    });
  }
}

const logger = new Logger();

// Route ffmpeg native logs through pup's logger.
Log.setCallback((level, message) => {
  const msg = message.trimEnd();
  if (!msg) return;
  if (level <= AV_LOG_ERROR) logger.error(msg);
  else if (level <= AV_LOG_WARNING) logger.warn(msg);
});

export { logger };
