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
export declare function installAudioCapture(): void;
