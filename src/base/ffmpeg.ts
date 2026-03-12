// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/09.

import { pupFFmpegPath } from "./constants";
import type { AudioSpec, VideoSpec } from "./schema";
import { x265 } from "./x265";

interface Command {
  command: string;
  args: string[];
}

const quiet = ["-hide_banner", "-loglevel", "error", "-nostats"];

export interface BGRAFileOptions {
  bgra: string;
  outFile: string;
  spec: VideoSpec;
  audio?: AudioSpec;
}

const ALLOWED_FILE_EXTS = [".mp4", ".webm"];

export function createBGRAFileCommand(options: BGRAFileOptions): Command {
  const { bgra, spec, outFile, audio } = options;
  const ext = ALLOWED_FILE_EXTS.find((ext) => outFile.endsWith(ext));
  if (!ext) {
    throw new Error(`out file must end with ${ALLOWED_FILE_EXTS}`);
  }

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
    bgra,
  ];

  if (audio) {
    args.push(
      "-f",
      "f32le",
      "-ar",
      `${audio.sampleRate}`,
      "-ac",
      "2",
      "-i",
      audio.pcmPath,
    );
  }

  args.push("-frames:v", `${Math.floor(frames)}`);

  if (audio) {
    args.push("-map", "0:v", "-map", "1:a", "-shortest");
  }

  if (ext === ".mp4") {
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
    );
    if (audio) args.push("-c:a", "aac");
    args.push(outFile);
  }

  if (ext === ".webm") {
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
    );
    if (audio) args.push("-c:a", "libopus");
    args.push(outFile);
  }

  return { command: pupFFmpegPath, args };
}

interface X265Pipeline {
  raw: Command;
  x265: Command;
  mux: Command;
}

export function createBGRA2MOVPipeline(options: BGRAFileOptions): X265Pipeline {
  const { bgra, spec, outFile, audio } = options;
  if (!outFile.endsWith(".mov")) {
    throw new Error("out file must end with .mov");
  }

  const { fps, size } = spec;

  const muxArgs = [
    "-y",
    ...quiet,
    "-f",
    "hevc",
    "-r",
    `${fps}`,
    "-i",
    "pipe:0",
  ];

  if (audio) {
    muxArgs.push(
      "-f",
      "f32le",
      "-ar",
      `${audio.sampleRate}`,
      "-ac",
      "2",
      "-i",
      audio.pcmPath,
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-shortest",
    );
  } else {
    muxArgs.push("-c:v", "copy");
  }

  muxArgs.push("-tag:v", "hvc1", "-movflags", "+faststart", outFile);

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
        bgra,
        "-f",
        "rawvideo",
        "-pix_fmt",
        "yuva420p10le",
        "pipe:1",
      ],
    },
    x265: {
      command: x265,
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
      args: muxArgs,
    },
  };
}

export function createCoverCommand(src: string, dst: string): Command {
  return {
    command: pupFFmpegPath,
    args: ["-y", ...quiet, "-i", src, "-frames:v", "1", "-q:v", "2", dst],
  };
}
