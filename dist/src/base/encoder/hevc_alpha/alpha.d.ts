import type { Frame } from "node-av";
import { type NalUnit } from "./nal";
import type { NvencHevcConfig } from "./parser";
export declare function extractAlphaToYuv420pBuffer(bgraFrame: Frame, buf: Buffer): void;
export interface UnifiedExtradataOptions {
    baseExtradata: Buffer;
    alphaExtradata: Buffer;
    width: number;
    height: number;
}
export declare function buildUnifiedExtradata(opts: UnifiedExtradataOptions): Buffer;
export declare function buildAlphaChannelInfoSEI(): Buffer;
export declare function interleaveAccessUnits(baseNals: NalUnit[], alphaNals: NalUnit[], cfg: NvencHevcConfig): Buffer;
