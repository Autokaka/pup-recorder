// Created by Autokaka (qq1909698494@gmail.com) on 2026/07/27.

export type WorldMode = "shoot" | "render" | "audio";

// Names the page-world bundle in the preload's argv; keep this module dependency-free, the preload loads it as-is.
export const WORLD_ARG = "--pup-world=";

// Present only when the run captures audio, so a page in any other mode has no channel to push PCM through.
export const AUDIO_ARG = "--pup-audio";
