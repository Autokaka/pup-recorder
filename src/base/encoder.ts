// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/09.

import { createBgraFileCommand, createBgraToMovPipeline } from "./ffmpeg";
import { exec, type ProcessHandle } from "./process";
import type { VideoSpec } from "./schema";

export function encodeBgraFile(
  bgraPath: string,
  outputPath: string,
  spec: VideoSpec,
  format: "mp4" | "webm",
): ProcessHandle {
  const files = format === "mp4" ? { mp4: outputPath } : { webm: outputPath };
  const cmd = createBgraFileCommand(bgraPath, spec, files);
  return exec(`${cmd.command} ${cmd.args.join(" ")}`, {
    stdio: ["ignore", "inherit", "inherit"],
  });
}

export function encodeBgraToMov(
  bgraPath: string,
  movPath: string,
  spec: VideoSpec,
): ProcessHandle {
  const x265 = createBgraToMovPipeline(bgraPath, spec, movPath);
  const shellCmd = [
    `${x265.raw.command} ${x265.raw.args.join(" ")}`,
    `${x265.x265.command} ${x265.x265.args.join(" ")}`,
    `${x265.mux.command} ${x265.mux.args.join(" ")}`,
  ].join(" | ");
  return exec(shellCmd, {
    stdio: ["ignore", "inherit", "inherit"],
    shell: true,
  });
}
