// Created by Lu Ao (luao@bilibili.com) on 2026/05/26.

import { installTickHook } from "./runtime/iframe_hook";
import { installVideoHook } from "./runtime/iframe_video_hook";

if (window.self !== window.top) {
  installTickHook();
  installVideoHook();
}
