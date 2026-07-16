// Created by Autokaka (qq1909698494@gmail.com) on 2026/07/16.

declare global {
  interface Window {
    __HF_MODE__?: string;
  }
}

export function installHfHook() {
  window.__HF_MODE__ = "export";
}
