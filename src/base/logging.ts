// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/06.

import { ChildProcess, type Serializable } from "child_process";
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

class Logger implements LoggerLike {
  private _impl?: LoggerLike;

  get impl(): LoggerLike | undefined {
    return this._impl;
  }

  set impl(value: LoggerLike) {
    const debug = value.debug ?? console.debug;
    const info = value.info ?? console.info;
    const warn = value.warn ?? console.warn;
    const error = value.error ?? console.error;
    this._impl = {
      debug: pupLogLevel >= 3 ? debug : undefined,
      info: pupLogLevel >= 2 ? info : undefined,
      warn: pupLogLevel >= 1 ? warn : undefined,
      error: pupLogLevel >= 0 ? error : undefined,
    };
  }

  constructor() {
    this.impl = console;
  }

  debug(...messages: unknown[]): void {
    this.impl?.debug?.(DEBUG, ...messages);
  }

  info(...messages: unknown[]): void {
    this.impl?.info?.(INFO, ...messages);
  }

  warn(...messages: unknown[]): void {
    this.impl?.warn?.(WARN, ...messages);
  }

  error(...messages: unknown[]): void {
    this.impl?.error?.(ERROR, ...messages);
  }

  fatal(...messages: unknown[]): never {
    this.impl?.error?.(FATAL, ...messages);
    process.exit(1);
  }

  private dispatch(message: string) {
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

  attach(proc: ChildProcess, name: string) {
    return new Promise<void>((resolve, reject) => {
      this.debug(`${name}.attach`);
      let fatal: string = "";
      const dispatch = (data: Buffer | Serializable) => {
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
        .on("message", dispatch)
        .on("error", (err) => {
          fatal += err.message;
          proc.kill();
        })
        .once("close", (code, signal) => {
          if (code || signal || fatal) {
            fatal ||= `command failed: ${proc.spawnargs.join(" ")}`;
            this.error(`${name}.close`, { code, signal, fatal });
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

export { logger };
