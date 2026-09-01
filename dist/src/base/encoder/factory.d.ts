import { HardwareContext } from "node-av/api";
import { AudioEncoder } from "./audio";
import { CodecState } from "./codec";
import { NvencDualLayerEncoder } from "./hevc_alpha/nvenc";
import type { FormatMuxer } from "./muxer";
import type { SinkKind, SinkOptions } from "./sink";
import { VideoEncoder } from "./video";
import { VideoToolboxEncoder } from "./videotoolbox";
export type HwEncoder = VideoToolboxEncoder | NvencDualLayerEncoder;
export interface VideoSetup {
    video?: VideoEncoder;
    hwVideo?: HwEncoder;
    codec?: CodecState;
    hw?: HardwareContext;
    ownsHw: boolean;
}
export interface HwVideoFactoryOptions {
    width: number;
    height: number;
    fps: number;
    bitrate?: number;
    disableHwCodec?: boolean;
    sharedHw?: HardwareContext;
}
export declare function createMp4Video(opts: SinkOptions, muxer: FormatMuxer): Promise<VideoSetup>;
export declare function createWebmVideo(opts: SinkOptions, muxer: FormatMuxer): Promise<VideoSetup>;
export declare function createAudio(kind: SinkKind, muxer: FormatMuxer): Promise<AudioEncoder>;
export declare function createHwVideoEncoder(opts: HwVideoFactoryOptions, muxer: FormatMuxer): Promise<VideoSetup>;
