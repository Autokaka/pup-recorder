// Created by Autokaka (qq1909698494@gmail.com) on 2026/05/26.

import { installHfHook } from "./hf_hook";

if (window.self !== window.top) {
  installHfHook();
}
