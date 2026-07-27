// Created by Autokaka (qq1909698494@gmail.com) on 2026/05/26.

import { installHfHook } from "./hf_hook";
import { installStegoBridge } from "./stego_bridge";

if (window.self === window.top) {
  installStegoBridge();
} else {
  installHfHook();
}
