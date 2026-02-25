// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/06.

import type { Size } from "electron";

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
