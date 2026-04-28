// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/28.

import { ipcRenderer } from "electron";
import { AUDIO_CHUNK_CHANNEL, AUDIO_META_CHANNEL } from "./renderer/audio";

declare global {
  interface Window {
    __pup_audio_capturing__?: boolean;
    webkitAudioContext?: typeof AudioContext;
  }
  interface AudioContext {
    __pup_captureNode__?: AudioNode;
  }
  interface HTMLMediaElement {
    __pup_captured__?: boolean;
  }
}

if (!window.__pup_audio_capturing__) {
  window.__pup_audio_capturing__ = true;

  const capturedContexts = new WeakSet<AudioContext>();
  const sourcedElements = new WeakSet<HTMLMediaElement>();
  let metaSent = false;

  const origCreateMES = AudioContext.prototype.createMediaElementSource;
  AudioContext.prototype.createMediaElementSource = function (el) {
    sourcedElements.add(el);
    return origCreateMES.call(this, el);
  };

  const origConnect = AudioNode.prototype.connect as (...args: unknown[]) => AudioNode;
  AudioNode.prototype.connect = function (
    this: AudioNode,
    dest: AudioNode | AudioParam,
    outIdx?: number,
    inIdx?: number,
  ) {
    const ctx = (dest as AudioNode).context as AudioContext | undefined;
    const captureNode = ctx?.__pup_captureNode__;
    if (captureNode && ctx && dest === ctx.destination && this !== captureNode) {
      origConnect.call(this, captureNode, outIdx, inIdx);
    }
    return origConnect.call(this, dest, outIdx, inIdx);
  } as typeof AudioNode.prototype.connect;

  const OrigAC = window.AudioContext || window.webkitAudioContext;
  if (OrigAC) {
    function PatchedAC(this: AudioContext, ...args: unknown[]) {
      const ctx = new (OrigAC as { new (...a: unknown[]): AudioContext })(...args);
      if (!capturedContexts.has(ctx)) {
        capturedContexts.add(ctx);
        if (!metaSent) {
          metaSent = true;
          ipcRenderer.send(AUDIO_META_CHANNEL, { sampleRate: ctx.sampleRate });
        }
        const node = ctx.createScriptProcessor(4096, 2, 2);
        node.onaudioprocess = (e: AudioProcessingEvent) => {
          const L = e.inputBuffer.getChannelData(0);
          const R = e.inputBuffer.getChannelData(1);
          const out = new Float32Array(L.length * 2);
          for (let i = 0; i < L.length; i++) {
            out[i * 2] = L[i]!;
            out[i * 2 + 1] = R[i]!;
          }
          ipcRenderer.send(AUDIO_CHUNK_CHANNEL, Buffer.from(out.buffer));
        };
        node.connect(ctx.destination);
        ctx.__pup_captureNode__ = node;
      }
      return ctx;
    }
    PatchedAC.prototype = OrigAC.prototype;
    Object.setPrototypeOf(PatchedAC, OrigAC);
    window.AudioContext = PatchedAC as unknown as typeof AudioContext;
    if ("webkitAudioContext" in window) {
      window.webkitAudioContext = PatchedAC as unknown as typeof AudioContext;
    }

    const origPlay = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      if (!this.__pup_captured__) {
        this.__pup_captured__ = true;
        const el = this;
        Promise.resolve().then(() => {
          if (!sourcedElements.has(el)) {
            const ctx = new (PatchedAC as unknown as typeof AudioContext)();
            ctx.createMediaElementSource(el).connect(ctx.destination);
          }
        });
      }
      return origPlay.call(this);
    };
  }
}
