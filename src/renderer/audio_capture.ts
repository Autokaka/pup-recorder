// Created by Autokaka (qq1909698494@gmail.com) on 2026/03/02.

import type { AudioSpec } from "./schema";
import { randomUUID } from "crypto";
import { ipcMain, session } from "electron";
import { rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { FixedBufferWriter } from "../rust/lib";

const AUDIO_CAPTURE_SCRIPT = `
(function() {
  if (window.__pup_audio_capturing__) return;
  window.__pup_audio_capturing__ = true;

  const { ipcRenderer } = require('electron');
  const capturedContexts = new WeakSet();
  const sourcedElements = new WeakSet();
  let metaSent = false;

  const origCreateMES = AudioContext.prototype.createMediaElementSource;
  AudioContext.prototype.createMediaElementSource = function(el) {
    sourcedElements.add(el);
    return origCreateMES.call(this, el);
  };

  const origConnect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function(dest, outIdx, inIdx) {
    const captureNode = dest?.context?.__pup_captureNode__;
    if (captureNode && dest === dest.context.destination && this !== captureNode) {
      origConnect.call(this, captureNode, outIdx, inIdx);
    }
    return origConnect.call(this, dest, outIdx, inIdx);
  };

  const OrigAC = window.AudioContext || window.webkitAudioContext;
  if (!OrigAC) return;

  function PatchedAC() {
    const ctx = new OrigAC(...arguments);
    if (!capturedContexts.has(ctx)) {
      capturedContexts.add(ctx);
      if (!metaSent) {
        metaSent = true;
        ipcRenderer.send('audio-meta', { sampleRate: ctx.sampleRate });
      }
      const node = ctx.createScriptProcessor(4096, 2, 2);
      node.onaudioprocess = (e) => {
        const L = e.inputBuffer.getChannelData(0);
        const R = e.inputBuffer.getChannelData(1);
        const out = new Float32Array(L.length * 2);
        for (let i = 0; i < L.length; i++) {
          out[i * 2] = L[i];
          out[i * 2 + 1] = R[i];
        }
        ipcRenderer.send('audio-chunk', Buffer.from(out.buffer));
      };
      node.connect(ctx.destination);
      ctx.__pup_captureNode__ = node;
    }
    return ctx;
  }
  PatchedAC.prototype = OrigAC.prototype;
  Object.setPrototypeOf(PatchedAC, OrigAC);
  window.AudioContext = PatchedAC;
  if ('webkitAudioContext' in window) window.webkitAudioContext = PatchedAC;

  const origPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function() {
    if (!this.__pup_captured__) {
      this.__pup_captured__ = true;
      const el = this;
      Promise.resolve().then(() => {
        if (!sourcedElements.has(el)) {
          const ctx = new PatchedAC();
          ctx.createMediaElementSource(el).connect(ctx.destination);
        }
      });
    }
    return origPlay.call(this);
  };
})();
`;

export interface AudioCapture {
  teardown(): Promise<AudioSpec | undefined>;
}

export async function setupAudioCapture(outDir: string, getVideoTimeMs: () => number): Promise<AudioCapture> {
  const preloadPath = join(tmpdir(), `pup_audio_preload_${randomUUID()}.js`);
  await writeFile(preloadPath, AUDIO_CAPTURE_SCRIPT);
  session.defaultSession.registerPreloadScript({
    type: "frame",
    id: "pup-audio",
    filePath: preloadPath,
  });

  const pcmFile = join(outDir, "output.pcm");
  const PCM_CHUNK_SIZE = 4096 * 2 * 4; // 4096 samples × 2ch × f32
  const writer = new FixedBufferWriter(pcmFile, PCM_CHUNK_SIZE);
  let pcmStartMs: number | undefined;
  let pcmSampleRate: number | undefined;

  ipcMain.once("audio-meta", (_e, data: { sampleRate: number }) => {
    pcmStartMs = getVideoTimeMs();
    pcmSampleRate = data.sampleRate;
  });

  ipcMain.on("audio-chunk", (_e, buffer: Buffer) => writer.write(buffer));

  return {
    async teardown() {
      ipcMain.removeAllListeners("audio-meta");
      ipcMain.removeAllListeners("audio-chunk");
      session.defaultSession.unregisterPreloadScript("pup-audio");
      await rm(preloadPath, { force: true });
      await writer.close();
      if (pcmStartMs === undefined || pcmSampleRate === undefined) return undefined;
      return { pcmFile, pcmStartMs, pcmSampleRate };
    },
  };
}
