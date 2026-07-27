// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/28.

declare global {
  interface Window {
    __pup_audio_capturing__?: boolean;
    webkitAudioContext?: typeof AudioContext;
    __pup_audio__?: PupAudioBridge;
  }
  interface AudioContext {
    __pup_captureDest__?: MediaStreamAudioDestinationNode;
  }
  interface HTMLMediaElement {
    __pup_captured__?: boolean;
  }
}

export interface PupAudioBridge {
  meta: (sampleRate: number) => void;
  chunk: (pcm: Float32Array) => void;
}

interface Master {
  ctx: AudioContext;
  processor: ScriptProcessorNode;
}

// Page-world capture: patches AudioContext/HTMLMediaElement, then hands PCM to the preload bridge for IPC.
export function installAudioCapture(): void {
  if (window.__pup_audio_capturing__) {
    return;
  }
  window.__pup_audio_capturing__ = true;

  const ORIG_AC = window.AudioContext || window.webkitAudioContext;
  if (!ORIG_AC) {
    return;
  }

  const capturedContexts = new WeakSet<AudioContext>();
  const sourcedElements = new WeakSet<HTMLMediaElement>();

  let masterCtx: AudioContext | undefined;
  let masterProcessor: ScriptProcessorNode | undefined;

  const ensureMaster = (): Master => {
    if (masterCtx && masterProcessor) {
      return { ctx: masterCtx, processor: masterProcessor };
    }
    const ctx = new ORIG_AC();
    const processor = ctx.createScriptProcessor(4096, 2, 2);
    processor.onaudioprocess = (e: AudioProcessingEvent) => {
      const L = e.inputBuffer.getChannelData(0);
      const R = e.inputBuffer.getChannelData(1);
      const out = new Float32Array(L.length * 2);
      for (let i = 0; i < L.length; i++) {
        out[i * 2] = L[i] ?? 0;
        out[i * 2 + 1] = R[i] ?? 0;
      }
      // Resolved per call: contextBridge may expose the channel after this script has already run.
      window.__pup_audio__?.chunk(out);
    };
    processor.connect(ctx.destination);
    window.__pup_audio__?.meta(ctx.sampleRate);
    void ctx.resume();
    masterCtx = ctx;
    masterProcessor = processor;
    return { ctx, processor };
  };

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
    const captureDest = ctx?.__pup_captureDest__;
    if (captureDest && ctx && dest === ctx.destination && this !== captureDest) {
      origConnect.call(this, captureDest, outIdx, inIdx);
    }
    return origConnect.call(this, dest, outIdx, inIdx);
  } as typeof AudioNode.prototype.connect;

  function PatchedAC(this: AudioContext, ...args: unknown[]) {
    const ctx = new (ORIG_AC as { new (...a: unknown[]): AudioContext })(...args);
    if (!capturedContexts.has(ctx)) {
      capturedContexts.add(ctx);
      const master = ensureMaster();
      const captureDest = ctx.createMediaStreamDestination();
      ctx.__pup_captureDest__ = captureDest;
      master.ctx.createMediaStreamSource(captureDest.stream).connect(master.processor);
    }
    return ctx;
  }
  PatchedAC.prototype = ORIG_AC.prototype;
  Object.setPrototypeOf(PatchedAC, ORIG_AC);
  window.AudioContext = PatchedAC as unknown as typeof AudioContext;
  if ("webkitAudioContext" in window) {
    window.webkitAudioContext = PatchedAC as unknown as typeof AudioContext;
  }

  const origPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    if (!this.__pup_captured__) {
      this.__pup_captured__ = true;
      Promise.resolve().then(() => {
        if (!sourcedElements.has(this)) {
          const ctx = new (PatchedAC as unknown as typeof AudioContext)();
          ctx.createMediaElementSource(this).connect(ctx.destination);
        }
      });
    }
    return origPlay.call(this);
  };
}
