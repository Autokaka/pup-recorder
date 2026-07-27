// Created by Autokaka (qq1909698494@gmail.com) on 2026/07/27.

import { installAudioCapture } from "./audio/capture";

if (window.self !== window.top) {
  installAudioCapture();
}
