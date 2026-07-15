import type { WebContents } from "electron";
import type { EncoderPipeline } from "../base/encoder/pipeline";
export declare const AUDIO_META_CHANNEL = "audio-meta";
export declare const AUDIO_CHUNK_CHANNEL = "audio-chunk";
export interface AudioListenerOptions {
    wc: WebContents;
    encoder: EncoderPipeline;
    getVideoTimeMs: () => number;
    onError: (error: Error) => void;
}
export type AudioDisposal = () => void;
export declare function attachAudioListeners({ wc, encoder, getVideoTimeMs, onError }: AudioListenerOptions): AudioDisposal;
