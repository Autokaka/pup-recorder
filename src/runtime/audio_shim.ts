// -d captures no audio; a loading <audio> would hit the media→stub redirect, which serves video stubs only.

const SRC_NOT_SUPPORTED = 4; // MEDIA_ERR_SRC_NOT_SUPPORTED

// Mirror a failed native load so error-handling pages proceed exactly as they do when the source is broken.
function fail(el: HTMLAudioElement): void {
  queueMicrotask(() => {
    Object.defineProperty(el, "error", {
      configurable: true,
      value: { code: SRC_NOT_SUPPORTED, message: "audio disabled in deterministic mode" },
    });
    el.dispatchEvent(new Event("error"));
  });
}

// The native Audio() constructor invokes the load algorithm internally, so only a constructor swap can preempt the fetch.
function AudioShim(url?: string): HTMLAudioElement {
  const el = document.createElement("audio");
  el.preload = "none";
  if (url) {
    el.src = url;
    fail(el);
  }
  return el;
}

export function installAudioShim(): void {
  const NativeAudio = window.Audio;
  window.Audio = AudioShim as unknown as typeof Audio;
  window.Audio.prototype = NativeAudio.prototype;

  const HAE = HTMLAudioElement.prototype;
  HAE.load = function (this: HTMLAudioElement) {
    fail(this);
  };
  HAE.play = function (this: HTMLAudioElement) {
    fail(this);
    return Promise.reject(new DOMException("audio disabled in deterministic mode", "NotSupportedError"));
  };
}
