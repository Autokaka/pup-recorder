// Created by Autokaka (qq1909698494@gmail.com) on 2026/07/27.

import { installHfHook } from "./hyperframes";
import { installWindowFacade } from "./window";

if (window.self !== window.top) {
  installWindowFacade();
  installHfHook();
}
