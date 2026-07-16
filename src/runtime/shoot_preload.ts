// Created by Autokaka (qq1909698494@gmail.com) on 2026/05/26.

import { installHfHook } from "./hf_hook";
import { installTickHook } from "./tick_hook";
import { installVideoHook } from "./video/hook";

if (window.self !== window.top) {
  installHfHook();
  installTickHook();
  installVideoHook();
}
