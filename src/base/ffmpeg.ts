// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/09.

import { existsSync } from "fs";
import { join } from "path";
import { arch, platform } from "process";
import { basedir } from "./basedir";
import { pupFFmpegPath } from "./constants";
import type { VideoFiles, VideoSpec } from "./schema";

interface Command {
  command: string;
  args: string[];
}

const quiet = ["-hide_banner", "-loglevel", "error", "-nostats"];

function resolveX265() {
  const path = `x265/${platform}-${arch}`;
  const dirs = [
    join(basedir, `../../${path}`), // process from src
    join(basedir, `../${path}`), // process from dist
  ];
  const found = dirs.find(existsSync);
  if (!found) {
    throw new Error("x265 not found");
  }
  return found;
}

export function createBgraFileCommand(
  bgraPath: string,
  spec: VideoSpec,
  files: VideoFiles,
): Command {
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
    `${Math.floor(frames)}`,
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
      files.mp4,
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
      files.webm,
    );
  }
  return { command: pupFFmpegPath, args };
}

interface X265Pipeline {
  raw: Command;
  x265: Command;
  mux: Command;
}

export function createBgraToMovPipeline(
  bgraPath: string,
  spec: VideoSpec,
  mov: string,
): X265Pipeline {
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
        "pipe:1",
      ],
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
        "-",
      ],
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
        mov,
      ],
    },
  };
}

export function createCoverCommand(src: string, dst: string): Command {
  return {
    command: pupFFmpegPath,
    args: ["-y", ...quiet, "-i", src, "-frames:v", "1", "-q:v", "2", dst],
  };
}
