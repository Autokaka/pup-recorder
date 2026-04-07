// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/06.

import z from "zod";
import { pupDeterministic, pupUseInnerProxy } from "../base/constants";

export const DEFAULT_WIDTH = 1920;
export const DEFAULT_HEIGHT = 1080;
export const DEFAULT_FPS = 30;
export const DEFAULT_DURATION = 5;
export const DEFAULT_OUT_FILE = "output.mp4";

export const RenderSchema = z.object({
  duration: z.number().describe("Duration in seconds"),
  width: z.number().describe("Video width"),
  height: z.number().describe("Video height"),
  fps: z.number().describe("Frames per second"),
  withAudio: z.boolean().describe("Capture and encode audio"),
  outFile: z.string().describe("Output mp4 file path"),
  useInnerProxy: z.boolean().describe("Use bilibili inner proxy for resource access"),
  deterministic: z.boolean().describe("Render by frame rather than recording"),
});

export type RenderOptions = z.infer<typeof RenderSchema>;

export interface RenderResult {
  options: RenderOptions;
  written: number;
  jank: number;
  outFile: string;
}

export const defaultRenderOptions: RenderOptions = {
  width: DEFAULT_WIDTH,
  height: DEFAULT_HEIGHT,
  fps: DEFAULT_FPS,
  duration: DEFAULT_DURATION,
  outFile: DEFAULT_OUT_FILE,
  withAudio: false,
  useInnerProxy: pupUseInnerProxy,
  deterministic: pupDeterministic,
};
