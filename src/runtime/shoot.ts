// Created by Autokaka (qq1909698494@gmail.com) on 2026/07/27.

import { installAudioShim } from "./audio/shim";
import { installHfHook } from "./hyperframes";
import { installTickHook } from "./tick";
import { installVideoHook } from "./video/hook";

if (window.self !== window.top) {
  installAudioShim();
  installHfHook();
  installTickHook();
  installVideoHook();
}
