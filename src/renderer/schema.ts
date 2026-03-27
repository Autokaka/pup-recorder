// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/06.

import z from "zod";

export const DEFAULT_WIDTH = 1920;
export const DEFAULT_HEIGHT = 1080;
export const DEFAULT_FPS = 30;
export const DEFAULT_DURATION = 5;
export const DEFAULT_OUT_FILE = "output.mp4";

export const RenderSchema = z.object({
  duration: z.number().optional().default(DEFAULT_DURATION).describe("Duration in seconds"),
  width: z.number().optional().default(DEFAULT_WIDTH).describe("Video width"),
  height: z.number().optional().default(DEFAULT_HEIGHT).describe("Video height"),
  fps: z.number().optional().default(DEFAULT_FPS).describe("Frames per second"),
  withAudio: z.boolean().optional().default(false).describe("Capture and encode audio"),
  outFile: z.string().optional().default(DEFAULT_OUT_FILE).describe("Output mp4 file path"),
  useInnerProxy: z.boolean().optional().default(false).describe("Use bilibili inner proxy for resource access"),
  deterministic: z.boolean().optional().default(false).describe("Render by frame rather than recording"),
});

export type RenderOptions = z.infer<typeof RenderSchema>;

export interface AudioSpec {
  pcmFile: string;
  pcmStartMs: number;
  pcmSampleRate: number;
}

export interface RenderResult {
  options: RenderOptions;
  written: number;
  jank: number;
  outFile: string;
  audio?: AudioSpec;
}
