// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/06.

import type { Size } from "electron";
import z from "zod";

export interface VideoSpec {
  fps: number;
  frames: number;
  size: Size;
}

export interface VideoFiles {
  mp4?: string;
  webm?: string;
  mov?: string;
}

export interface VideoFilesWithCover extends VideoFiles {
  cover: string;
}

export const DEFAULT_WIDTH = 1920;
export const DEFAULT_HEIGHT = 1080;
export const DEFAULT_FPS = 30;
export const DEFAULT_DURATION = 5;
export const DEFAULT_OUT_DIR = "out";
export const VIDEO_FORMATS = ["mp4", "mov", "webm"] as const;

export type VideoFormat = (typeof VIDEO_FORMATS)[number];

export function isVideoFormat(s: string): s is VideoFormat {
  return VIDEO_FORMATS.includes(s as VideoFormat);
}

export const RenderSchema = z.object({
  duration: z
    .number()
    .optional()
    .default(DEFAULT_DURATION)
    .describe("Duration in seconds"),
  width: z.number().optional().default(DEFAULT_WIDTH).describe("Video width"),
  height: z
    .number()
    .optional()
    .default(DEFAULT_HEIGHT)
    .describe("Video height"),
  fps: z.number().optional().default(DEFAULT_FPS).describe("Frames per second"),
  formats: z
    .array(z.enum(VIDEO_FORMATS))
    .optional()
    .default(["mp4"])
    .describe(`Output video formats, allow ${VIDEO_FORMATS.join(", ")}`),
  withAudio: z
    .boolean()
    .optional()
    .default(false)
    .describe("Capture and encode audio"),
  outDir: z
    .string()
    .optional()
    .default(DEFAULT_OUT_DIR)
    .describe("Output directory"),
  useInnerProxy: z
    .boolean()
    .optional()
    .default(false)
    .describe("Use bilibili inner proxy for resource access"),
  deterministic: z
    .boolean()
    .optional()
    .default(false)
    .describe("Render by frame rather than recording"),
});

export type RenderOptions = z.infer<typeof RenderSchema>;

export interface AudioSpec {
  pcmPath: string;
  sampleRate: number;
}

export interface RenderResult {
  options: RenderOptions;
  written: number;
  bgra: string;
  audio?: AudioSpec;
}
