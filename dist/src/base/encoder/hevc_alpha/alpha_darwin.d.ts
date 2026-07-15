import type { NvencHevcConfig } from "./parser";
/** Patch every VPS/SPS NAL in an Annex B bitstream so PTL matches Apple/x265. */
export declare function patchHevcAlphaPtl(bitstream: Buffer): Buffer;
/** Alpha SPS: sps_seq_parameter_set_id 0 → 1. */
export declare function rewriteAlphaSps(sps: Buffer): Buffer;
/** Alpha PPS: pps_pic_parameter_set_id 0 → 1, pps_seq_parameter_set_id 0 → 1. */
export declare function rewriteAlphaPps(pps: Buffer): Buffer;
/**
 * Rewrite alpha slice header: slice_pic_parameter_set_id 0 → 1.
 * The +2-bit shift is absorbed by emitting a fresh byte_alignment then appending the
 * original CABAC slice_segment_data bytes verbatim. CABAC byte boundary is preserved.
 */
export declare function rewriteAlphaSliceHeader(slice: Buffer, nalType: number, cfg: NvencHevcConfig): Buffer;
