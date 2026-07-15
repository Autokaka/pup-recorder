declare const NAL_HEADER_SIZE = 2;
declare const ANNEX_B_START_CODE: Buffer<ArrayBuffer>;
export { ANNEX_B_START_CODE, NAL_HEADER_SIZE };
export declare const NAL_BLA_W_LP = 16;
export declare const NAL_IDR_W_RADL = 19;
export declare const NAL_IDR_N_LP = 20;
export declare const NAL_RSV_IRAP_VCL23 = 23;
export declare const NAL_VPS = 32;
export declare const NAL_SPS = 33;
export declare const NAL_PPS = 34;
export declare const NAL_SEI_PREFIX = 39;
export declare const NAL_SEI_SUFFIX = 40;
export interface NalUnit {
    type: number;
    layerId: number;
    data: Buffer;
}
export declare function encodeNalHeader(type: number, layerId: number, temporalId: number): [number, number];
/** Split Annex B bitstream into NAL units. */
export declare function splitNalUnits(bitstream: Buffer): NalUnit[];
/** Rewrite nuh_layer_id in a NAL unit (returns copy). */
export declare function rewriteNalLayerId(nal: Buffer, layerId: number): Buffer;
/** Rewrite nal_unit_type in a NAL unit (returns copy). */
export declare function rewriteNalType(nal: Buffer, newType: number): Buffer;
/** Remove emulation prevention bytes (00 00 03 → 00 00) from RBSP. */
export declare function removeEmulationPrevention(data: Buffer): Buffer;
/** Insert emulation prevention bytes (00 00 03) for Annex B compliance. */
export declare function addEmulationPrevention(nal: Buffer): Buffer;
