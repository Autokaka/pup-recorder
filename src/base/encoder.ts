// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/09.

import type { StdioOptions } from "child_process";
import {
  createBGRA2MOVPipeline,
  createBGRAFileCommand,
  type BGRAFileOptions,
} from "./ffmpeg";
import { exec, type ProcessHandle } from "./process";

const stdio: StdioOptions = ["ignore", "inherit", "inherit"];

export function encodeBGRAFile(options: BGRAFileOptions): ProcessHandle {
  const cmd = createBGRAFileCommand(options);
  return exec(`${cmd.command} ${cmd.args.join(" ")}`, { stdio });
}

export function encodeBgraToMov(options: BGRAFileOptions): ProcessHandle {
  const x265 = createBGRA2MOVPipeline(options);
  const cmd = [
    `${x265.raw.command} ${x265.raw.args.join(" ")}`,
    `${x265.x265.command} ${x265.x265.args.join(" ")}`,
    `${x265.mux.command} ${x265.mux.args.join(" ")}`,
  ].join(" | ");
  return exec(cmd, { stdio, shell: true });
}
