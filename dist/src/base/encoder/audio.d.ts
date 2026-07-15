import { AV_SAMPLE_FMT_FLT, AV_SAMPLE_FMT_FLTP, type FFAudioEncoder } from "node-av/constants";
import type { FormatMuxer } from "./muxer";
export interface AudioEncoderOptions {
    outSampleRate: number;
    outSampleFmt: typeof AV_SAMPLE_FMT_FLT | typeof AV_SAMPLE_FMT_FLTP;
    codecName: FFAudioEncoder;
    globalHeader: boolean;
    bitrate: number;
    muxer: FormatMuxer;
}
export declare class AudioEncoder implements Disposable {
    private _ctx;
    private _stream;
    private _pkt;
    private _outRate;
    private _outFmt;
    private _frameSize;
    private _filterFrame;
    private _graph?;
    private _bufSrc?;
    private _bufSink?;
    private _inRate?;
    private _pts;
    private constructor();
    static create(opts: AudioEncoderOptions): Promise<AudioEncoder>;
    setInputRate(inSampleRate: number): void;
    encode(pcm: Buffer, muxer: FormatMuxer): Promise<void>;
    flush(muxer: FormatMuxer): Promise<void>;
    [Symbol.dispose](): void;
    private drain;
    private drainCodec;
}
