// Created by Autokaka (qq1909698494@gmail.com) on 2026/01/30.

import { spawn, type ChildProcess, type SpawnOptions } from "child_process";
import { logger } from "./logging";

export const PUP_ARGS_ENV_KEY = "__PUP_ARGS__";

export function pargs() {
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

export interface ProcessHandle {
  process: ChildProcess;
  wait: Promise<void>;
}

export function exec(cmd: string, options?: SpawnOptions): ProcessHandle {
  const parts = cmd.split(" ").filter((s) => s.length);
  const [command, ...args] = parts;
  if (!command) throw new Error("empty command");
  const proc = spawn(command, args, {
    stdio: "inherit",
    ...options,
  });
  return { process: proc, wait: logger.attach(proc, command) };
}
