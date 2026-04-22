// Created by Autokaka (qq1909698494@gmail.com) on 2026/01/30.

import { spawn, type ChildProcess, type SpawnOptions } from "child_process";
import treeKill from "tree-kill";
import { logger } from "./logging";

export const PUP_ARGS_KEY = "--pup-priv-args";

export function pargs() {
  const argv = process.argv;
  let priv = argv.find((arg) => arg.startsWith(PUP_ARGS_KEY));
  if (!priv) {
    logger.debug("procargv", argv);
    return process.argv;
  }
  const args = ["exec", ...argv.slice(-1)];
  priv = Buffer.from(priv.split("=")[1]!, "base64").toString();
  args.push(...JSON.parse(priv));
  logger.debug("pupargs", args);
  return args;
}

export interface ProcessHandle {
  process: ChildProcess;
  wait: Promise<void>;
  get killed(): boolean;
  kill(): void;
}

export function exec(cmd: string, options?: SpawnOptions): ProcessHandle {
  const parts = cmd.split(" ").filter((s) => s.length);
  const [command, ...args] = parts;
  if (!command) throw new Error("empty command");
  const proc = spawn(command, args, {
    stdio: "inherit",
    ...options,
  });
  let killed = false;
  return {
    process: proc,
    wait: logger.attach(proc, command),
    get killed() {
      return killed;
    },
    kill() {
      if (killed) return;
      killed = true;
      const pid = proc.pid;
      if (pid) treeKill(pid, "SIGKILL");
      else proc.kill("SIGKILL");
    },
  };
}
