// Created by Lu Ao (luao@bilibili.com) on 2026/05/18.

import { spawn } from "child_process";
import { ffmpegPath } from "node-av/ffmpeg";

const FFMPEG = ffmpegPath();
const PROBE_TIMEOUT_MS = 5_000;

export interface ProbeResult {
  width: number;
  height: number;
  duration: number;
}

export function probe(src: string): Promise<ProbeResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG, ["-hide_banner", "-i", src, "-vframes", "0", "-f", "ffmetadata", "-"], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error(`probe timed out after ${PROBE_TIMEOUT_MS}ms: ${src}`));
    }, PROBE_TIMEOUT_MS);
    proc.stderr!.on("data", (b: Buffer) => (stderr += b.toString()));
    proc.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    proc.on("exit", () => {
      clearTimeout(timer);
      const dim = stderr.match(/, (\d+)x(\d+)[, ]/);
      const dur = stderr.match(/Duration: (\d+):(\d+):(\d+\.\d+)/);
      if (!dim || !dur) return reject(new Error(`probe failed: ${src}\n${stderr}`));
      resolve({
        width: parseInt(dim[1]!, 10),
        height: parseInt(dim[2]!, 10),
        duration: parseInt(dur[1]!, 10) * 3600 + parseInt(dur[2]!, 10) * 60 + parseFloat(dur[3]!),
      });
    });
  });
}
