// Parse NVENC SPS/PPS extradata at encoder init to derive flags the slice header parser depends on.
// Defuses fragile hardcoded assumptions: if NVENC defaults shift, throws with actionable error.

import { BitReader } from "./bit";
import { NAL_PPS, NAL_SPS, removeEmulationPrevention, splitNalUnits } from "./nal";

export interface NvencHevcConfig {
  log2MaxPocLsb: number;
  numShortTermRefPicSets: number;
  numDeltaPocsSet0: number;
  longTermRefPicsPresent: boolean;
  spsTemporalMvpEnabled: boolean;
  saoEnabled: boolean;
  cabacInitPresent: boolean;
  ppsHasLoopFilterAcrossSlicesFlag: boolean;
}

function fail(field: string, got: unknown, expected: string): never {
  throw new Error(`hevc_alpha: NVENC SPS/PPS unsupported: ${field}=${got}, expected ${expected}`);
}

function skipPtl(br: BitReader, maxSubLayers: number): void {
  br.read(2 + 1 + 5); // profile_space, tier, profile_idc
  br.read(32); // profile_compatibility_flag[0..31]
  br.read(48); // 4 source/packed flags + 43 constraint/reserved + 1 inbld
  br.read(8); // level_idc
  const subProfilePresent: number[] = [];
  const subLevelPresent: number[] = [];
  for (let i = 0; i < maxSubLayers; i++) {
    subProfilePresent.push(br.read(1));
    subLevelPresent.push(br.read(1));
  }
  if (maxSubLayers > 0) for (let i = maxSubLayers; i < 8; i++) br.read(2);
  for (let i = 0; i < maxSubLayers; i++) {
    if (subProfilePresent[i]) br.read(8 + 32 + 48);
    if (subLevelPresent[i]) br.read(8);
  }
}

function parseSps(spsRbsp: Buffer): {
  log2MaxPocLsb: number;
  saoEnabled: boolean;
  numShortTermRefPicSets: number;
  numDeltaPocsSet0: number;
  longTermRefPicsPresent: boolean;
  spsTemporalMvpEnabled: boolean;
} {
  const br = new BitReader(spsRbsp);
  br.read(16); // NAL header
  br.read(4); // sps_video_parameter_set_id
  const maxSubLayers = br.read(3);
  // alpha_darwin.rewriteAlphaSps + vps.extractPTL hardcode 96-bit PTL — only valid when sub_layers=0.
  if (maxSubLayers !== 0) fail("sps_max_sub_layers_minus1", maxSubLayers, "0");
  br.read(1); // sps_temporal_id_nesting_flag
  skipPtl(br, maxSubLayers);
  br.readUe(); // sps_seq_parameter_set_id
  const chromaFormat = br.readUe();
  if (chromaFormat === 3) fail("chroma_format_idc", chromaFormat, "≠3");
  br.readUe(); // pic_width_in_luma_samples
  br.readUe(); // pic_height_in_luma_samples
  if (br.read(1)) {
    br.readUe(); br.readUe(); br.readUe(); br.readUe();
  }
  br.readUe(); // bit_depth_luma_minus8
  br.readUe(); // bit_depth_chroma_minus8
  const log2MaxPocLsb = br.readUe() + 4;
  const subOrderInfo = br.read(1);
  const orderCount = subOrderInfo ? maxSubLayers + 1 : 1;
  for (let i = 0; i < orderCount; i++) {
    br.readUe(); br.readUe(); br.readUe();
  }
  br.readUe(); br.readUe(); br.readUe(); br.readUe();
  br.readUe(); br.readUe();
  if (br.read(1)) fail("scaling_list_enabled_flag", 1, "0");
  br.read(1); // amp_enabled_flag
  const saoEnabled = br.read(1) === 1;
  if (br.read(1)) fail("pcm_enabled_flag", 1, "0");
  const numStRps = br.readUe();
  if (numStRps > 1) fail("num_short_term_ref_pic_sets", numStRps, "≤1");
  let numDeltaPocsSet0 = 0;
  if (numStRps === 1) {
    const numNeg = br.readUe();
    const numPos = br.readUe();
    numDeltaPocsSet0 = numNeg + numPos;
    for (let i = 0; i < numNeg; i++) { br.readUe(); br.read(1); }
    for (let i = 0; i < numPos; i++) { br.readUe(); br.read(1); }
  }
  const longTermRefPicsPresent = br.read(1) === 1;
  if (longTermRefPicsPresent) fail("long_term_ref_pics_present_flag", 1, "0");
  const spsTemporalMvpEnabled = br.read(1) === 1;
  return { log2MaxPocLsb, saoEnabled, numShortTermRefPicSets: numStRps, numDeltaPocsSet0, longTermRefPicsPresent, spsTemporalMvpEnabled };
}

function parsePps(ppsRbsp: Buffer): { cabacInitPresent: boolean; ppsHasLoopFilterAcrossSlicesFlag: boolean } {
  const br = new BitReader(ppsRbsp);
  br.read(16); // NAL header
  br.readUe(); // pps_pic_parameter_set_id
  br.readUe(); // pps_seq_parameter_set_id
  br.read(1); // dependent_slice_segments_enabled_flag
  br.read(1); // output_flag_present_flag
  const numExtraSliceHeaderBits = br.read(3);
  if (numExtraSliceHeaderBits !== 0) fail("num_extra_slice_header_bits", numExtraSliceHeaderBits, "0");
  br.read(1); // sign_data_hiding_enabled_flag
  const cabacInitPresent = br.read(1) === 1;
  br.readUe(); // num_ref_idx_l0_default_active_minus1
  br.readUe(); // num_ref_idx_l1_default_active_minus1
  br.readUe(); // init_qp_minus26 (se, but ue parser fine to advance)
  br.read(1); // constrained_intra_pred_flag
  br.read(1); // transform_skip_enabled_flag
  if (br.read(1)) br.readUe(); // cu_qp_delta_enabled → diff_cu_qp_delta_depth
  br.readUe(); // pps_cb_qp_offset
  br.readUe(); // pps_cr_qp_offset
  br.read(1); // pps_slice_chroma_qp_offsets_present_flag
  br.read(1); // weighted_pred_flag
  br.read(1); // weighted_bipred_flag
  br.read(1); // transquant_bypass_enabled_flag
  if (br.read(1)) fail("tiles_enabled_flag", 1, "0");
  br.read(1); // entropy_coding_sync_enabled_flag
  const ppsLoopFilterAcrossSlicesEnabled = br.read(1) === 1;
  const deblockingControlPresent = br.read(1);
  let sliceDeblockingDisabledOverride = false;
  if (deblockingControlPresent) {
    br.read(1); // deblocking_filter_override_enabled_flag
    sliceDeblockingDisabledOverride = br.read(1) === 1; // pps_deblocking_filter_disabled_flag
    if (!sliceDeblockingDisabledOverride) {
      br.readUe(); br.readUe(); // beta/tc offsets (se via ue advance)
    }
  }
  // slice_loop_filter_across_slices_enabled_flag in slice header is present iff
  // pps_loop_filter_across_slices_enabled_flag && !slice_deblocking_disabled.
  const ppsHasLoopFilterAcrossSlicesFlag = ppsLoopFilterAcrossSlicesEnabled && !sliceDeblockingDisabledOverride;
  return { cabacInitPresent, ppsHasLoopFilterAcrossSlicesFlag };
}

export function parseNvencHevcConfig(extradata: Buffer): NvencHevcConfig {
  const nals = splitNalUnits(extradata);
  const sps = nals.find((n) => n.type === NAL_SPS);
  const pps = nals.find((n) => n.type === NAL_PPS);
  if (!sps) throw new Error("hevc_alpha: SPS missing in NVENC extradata");
  if (!pps) throw new Error("hevc_alpha: PPS missing in NVENC extradata");
  const s = parseSps(removeEmulationPrevention(sps.data));
  const p = parsePps(removeEmulationPrevention(pps.data));
  return { ...s, ...p };
}
