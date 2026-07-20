// Created by Autokaka (qq1909698494@gmail.com) on 2026/05/26.

import { installAudioShim } from "./audio_shim";
import { installHfHook } from "./hf_hook";
import { installTickHook } from "./tick_hook";
import { installVideoHook } from "./video/hook";

if (window.self !== window.top) {
  installAudioShim();
  installHfHook();
  installTickHook();
  installVideoHook();
}
