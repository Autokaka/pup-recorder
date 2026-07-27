// Created by Autokaka (qq1909698494@gmail.com) on 2026/07/27.

import { installHfHook } from "./hyperframes";

if (window.self !== window.top) {
  installHfHook();
}
