// Created by Autokaka (qq1909698494@gmail.com) on 2026/07/27.

import { ipcRenderer } from "electron";
import { STEGO_TICK_CHANNEL } from "../renderer/stego";

declare global {
  interface Window {
    __pup_stego_tick__?: () => void;
  }
}

// The wrapper page has no node access (nodeIntegration off, so an injected payload can't reach require either).
export function installStegoBridge(): void {
  window.__pup_stego_tick__ = () => ipcRenderer.send(STEGO_TICK_CHANNEL);
}
