// Created by Autokaka (qq1909698494@gmail.com) on 2026/03/02.

import { type WebContents } from "electron";
import type { EncoderPipeline } from "../base/encoder/pipeline";

export const AUDIO_META_CHANNEL = "audio-meta";
export const AUDIO_CHUNK_CHANNEL = "audio-chunk";

export interface AudioListenerOptions {
  wc: WebContents;
  encoder: EncoderPipeline;
  getVideoTimeMs: () => number;
  onError: (error: Error) => void;
}

export type AudioDisposal = () => void;

export function attachAudioListeners({ wc, encoder, getVideoTimeMs, onError }: AudioListenerOptions): AudioDisposal {
  const onMeta = async (_e: unknown, data: { sampleRate: number }) => {
    const sampleRate = data.sampleRate;
    const startMs = getVideoTimeMs();
    encoder.setupAudio(sampleRate);
    const silenceSamples = Math.ceil((startMs * sampleRate) / 1000);
    if (silenceSamples <= 0) return;
    try {
      await encoder.encodeAudio(Buffer.alloc(silenceSamples * 2 * 4));
    } catch (error) {
      onError(error as Error);
    }
  };

  const onChunk = async (_e: unknown, buffer: Buffer) => {
    try {
      await encoder.encodeAudio(buffer);
    } catch (error) {
      onError(error as Error);
    }
  };

  wc.ipc.on(AUDIO_META_CHANNEL, onMeta);
  wc.ipc.on(AUDIO_CHUNK_CHANNEL, onChunk);

  return () => {
    wc.ipc.removeListener(AUDIO_META_CHANNEL, onMeta);
    wc.ipc.removeListener(AUDIO_CHUNK_CHANNEL, onChunk);
  };
}
