import { HardwareContext } from "node-av/api";
import { CodecState } from "./codec";
import { NvencDualLayerEncoder } from "./hevc_alpha/nvenc";
import type { FormatMuxer } from "./muxer";
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
export declare function createHwVideoEncoder(opts: HwVideoFactoryOptions, muxer: FormatMuxer): Promise<VideoSetup>;
