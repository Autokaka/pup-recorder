// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/28.

declare global {
  interface Window {
    __pup_audio_capturing__?: boolean;
    webkitAudioContext?: typeof AudioContext;
    __pup_audio__?: PupAudioBridge;
  }
  interface AudioContext {
    __pup_capture_dest__?: MediaStreamAudioDestinationNode;
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
  node: AudioWorkletNode;
}

// Runs on the worklet thread, so it ships as source text instead of as part of this bundle.
const WORKLET_SRC = `
class PupCapture extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (!input || !input.length) return true;
    const L = input[0];
    const R = input[1] || L;
    const out = new Float32Array(L.length * 2);
    for (let i = 0; i < L.length; i++) {
      out[i * 2] = L[i];
      out[i * 2 + 1] = R[i];
    }
    this.port.postMessage(out, [out.buffer]);
    return true;
  }
}
registerProcessor('pup-capture', PupCapture);
`;

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

  // One master context mixes every page context, so the encoder sees a single stream whatever the page builds.
  let master: Promise<Master> | undefined;

  const ensureMaster = (): Promise<Master> => {
    master ??= (async () => {
      const ctx = new ORIG_AC();
      const url = URL.createObjectURL(new Blob([WORKLET_SRC], { type: "application/javascript" }));
      await ctx.audioWorklet.addModule(url);
      URL.revokeObjectURL(url);
      const node = new AudioWorkletNode(ctx, "pup-capture");
      // Muted path to the destination: a worklet that reaches no sink is never pulled, so it would capture nothing.
      const mute = ctx.createGain();
      mute.gain.value = 0;
      node.connect(mute).connect(ctx.destination);
      node.port.onmessage = (e: MessageEvent<Float32Array>) => {
        // Resolved per call: contextBridge may expose the channel after this script has already run.
        window.__pup_audio__?.chunk(e.data);
      };
      window.__pup_audio__?.meta(ctx.sampleRate);
      void ctx.resume();
      return { ctx, node };
    })();
    return master;
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
    const captureDest = ctx?.__pup_capture_dest__;
    if (captureDest && ctx && dest === ctx.destination && this !== captureDest) {
      origConnect.call(this, captureDest, outIdx, inIdx);
    }
    return origConnect.call(this, dest, outIdx, inIdx);
  } as typeof AudioNode.prototype.connect;

  function PatchedAC(this: AudioContext, ...args: unknown[]) {
    const ctx = new (ORIG_AC as { new (...a: unknown[]): AudioContext })(...args);
    if (!capturedContexts.has(ctx)) {
      capturedContexts.add(ctx);
      // Tap assigned synchronously, so a connect() issued right after construction already routes into it.
      const captureDest = ctx.createMediaStreamDestination();
      ctx.__pup_capture_dest__ = captureDest;
      // The tap belongs to the master context: connecting nodes across contexts is an error.
      void ensureMaster().then((m) => m.ctx.createMediaStreamSource(captureDest.stream).connect(m.node));
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
