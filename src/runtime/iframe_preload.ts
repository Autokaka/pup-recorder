// Created by Autokaka (qq1909698494@gmail.com) on 2026/05/26.

import { installTickHook } from "./iframe_hook";
import { installVideoHook } from "./video/hook";

if (window.self !== window.top) {
  installTickHook();
  installVideoHook();
}
