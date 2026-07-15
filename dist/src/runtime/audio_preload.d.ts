declare global {
    interface Window {
        __pup_audio_capturing__?: boolean;
        webkitAudioContext?: typeof AudioContext;
    }
    interface AudioContext {
        __pup_captureDest__?: MediaStreamAudioDestinationNode;
    }
    interface HTMLMediaElement {
        __pup_captured__?: boolean;
    }
}
export {};
