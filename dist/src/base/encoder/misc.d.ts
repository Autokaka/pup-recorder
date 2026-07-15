import { type Codec, CodecContext, Frame, type HardwareFramesContext, Packet, type Stream } from "node-av";
import { type AVColorRange, type AVPixelFormat, type FFVideoEncoder } from "node-av/constants";
import type { FormatMuxer } from "./muxer";
export declare const FF_ENCODER_LIBVPX_VP9: FFVideoEncoder;
export interface VideoCtxOptions {
    codec: Codec;
    width: number;
    height: number;
    fps: number;
    bitrate: number;
    pixelFormat: AVPixelFormat;
    codecTag?: string;
    colorRange?: AVColorRange;
    options?: Record<string, string>;
    hwFramesCtx?: HardwareFramesContext;
}
export declare function openVideoCtx(opts: VideoCtxOptions, label: string): Promise<CodecContext>;
export declare function makeFrame(width: number, height: number, pixFmt: AVPixelFormat): Frame;
export declare function makePacket(): Packet;
export declare function drainPackets(ctx: CodecContext, pkt: Packet, stream: Stream, muxer: FormatMuxer): Promise<void>;
