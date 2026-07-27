// Created by Autokaka (qq1909698494@gmail.com) on 2026/07/27.

import { readFileSync } from "node:fs";
import { contextBridge, ipcRenderer, webFrame } from "electron";

import { AUDIO_CHUNK_CHANNEL, AUDIO_META_CHANNEL } from "../renderer/audio";
import { STEGO_TICK_CHANNEL } from "../renderer/stego";
import type { PupAudioBridge } from "./audio/capture";
import { WORLD_ARG } from "./world";

const audio: PupAudioBridge = {
  meta: (sampleRate) => ipcRenderer.send(AUDIO_META_CHANNEL, { sampleRate }),
  chunk: (pcm) => ipcRenderer.send(AUDIO_CHUNK_CHANNEL, Buffer.from(pcm.buffer)),
};

// Guards the whole design: without isolation the page shares this scope and can fish ipcRenderer out of it.
if (!process.contextIsolated) {
  throw new Error("preload requires contextIsolation");
}

// The only capability the page world gets: two fixed IPC channels behind contextBridge, never ipcRenderer itself.
contextBridge.exposeInMainWorld("__pup_stego_tick__", () => ipcRenderer.send(STEGO_TICK_CHANNEL));
contextBridge.exposeInMainWorld("__pup_audio__", audio);

// Hooks must patch page globals, so they run in the main world — reachable from here but not from this isolated scope.
const worldScript = process.argv.find((a) => a.startsWith(WORLD_ARG))?.slice(WORLD_ARG.length);
if (worldScript) {
  webFrame.executeJavaScript(readFileSync(worldScript, "utf-8"));
}
