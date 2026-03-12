// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/09.

import type { StdioOptions } from "child_process";
import {
  createBGRA2MOVPipeline,
  createBGRAFileCommand,
  type BGRAFileOptions,
} from "./ffmpeg";
import { exec, type ProcessHandle } from "./process";
import { mountX265, unmountX265 } from "./x265";

const stdio: StdioOptions = ["ignore", "inherit", "inherit"];

export function encodeBGRAFile(options: BGRAFileOptions): ProcessHandle {
  const cmd = createBGRAFileCommand(options);
  return exec(`${cmd.command} ${cmd.args.join(" ")}`, { stdio });
}

export function encodeBgraToMov(options: BGRAFileOptions): ProcessHandle {
  const x265 = mountX265();
  const pipeline = createBGRA2MOVPipeline(x265, options);
  const cmd = [
    `${pipeline.raw.command} ${pipeline.raw.args.join(" ")}`,
    `${pipeline.x265.command} ${pipeline.x265.args.join(" ")}`,
    `${pipeline.mux.command} ${pipeline.mux.args.join(" ")}`,
  ].join(" | ");
  const handle = exec(cmd, { stdio, shell: true });
  handle.wait.finally(() => unmountX265(x265));
  return handle;
}
