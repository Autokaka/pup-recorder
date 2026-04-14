// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/13.

import { BitReader, BitWriter, packBits } from "./bit";
import { addEmulationPrevention, removeEmulationPrevention } from "./nal";

interface ParsedPTL {
  ptlStart: number;
  ptlEnd: number;
  ptlBits: number[];
  maxSubLayersMinus1: number;
}

function extractPTL(vpsData: Buffer): ParsedPTL | undefined {
  const br = new BitReader(removeEmulationPrevention(vpsData));
  br.read(16); // NAL header
  br.read(4); // vps_id
  br.read(2); // base_layer_internal + available
  if (br.read(6) > 0) return undefined; // already multi-layer
  const maxSubLayersMinus1 = br.read(3);
  br.read(1 + 16); // temporal_nesting + reserved

  const ptlStart = br.pos;
  br.read(96); // general PTL (profile_space + tier + idc + compat + constraints + level)
  if (maxSubLayersMinus1 > 0) br.read(maxSubLayersMinus1 * 2 + (8 - maxSubLayersMinus1) * 2);
  return { ptlStart, ptlEnd: br.pos, ptlBits: br.bits, maxSubLayersMinus1 };
}

/** Write base VPS fields for 2-layer alpha. */
function writeBaseVPS(bw: BitWriter, ptl: ParsedPTL) {
  bw.w(0x4001, 16); // NAL header
  bw.w(0, 4); // vps_id
  bw.flag(1); // base_layer_internal
  bw.flag(1); // base_layer_available
  bw.w(1, 6); // max_layers_minus1 = 1
  bw.w(ptl.maxSubLayersMinus1, 3);
  // temporal_nesting: true when single sub-layer (all refs layer 0)
  bw.flag(ptl.maxSubLayersMinus1 === 0);
  bw.w(0xffff, 16); // reserved
  bw.copy(ptl.ptlBits, ptl.ptlStart, ptl.ptlEnd - ptl.ptlStart);

  bw.flag(1); // sub_layer_ordering_info_present
  for (let i = 0; i <= ptl.maxSubLayersMinus1; i++) {
    bw.ue(4); // maxDecPicBuffering - 1
    bw.ue(2); // numReorderPics
    bw.ue(4); // maxLatencyIncrease + 1
  }

  bw.w(1, 6); // max_nuh_layer_id = 1
  bw.ue(1); // num_layer_sets_minus1 = 1
  bw.flag(1); // layer_id_included[1][0]
  bw.flag(1); // layer_id_included[1][1]
  bw.flag(0); // timing_info_present
  bw.flag(1); // vps_extension_flag
  bw.align(1); // extension alignment bits = 1
}

/** Write VPS extension matching x265 4.1 ENABLE_ALPHA. */
function writeVPSExtension(bw: BitWriter, ptl: ParsedPTL, width: number, height: number) {
  // Extension PTL: level_idc only (profilePresentFlag=0)
  bw.copy(ptl.ptlBits, ptl.ptlEnd - 8, 8);
  if (ptl.maxSubLayersMinus1 > 0) {
    for (let i = 0; i < ptl.maxSubLayersMinus1; i++) bw.w(0, 2);
    for (let i = ptl.maxSubLayersMinus1; i < 8; i++) bw.w(0, 2);
  }

  bw.flag(0); // splitting_flag
  for (let i = 0; i < 16; i++) bw.flag(i === 2 || i === 3); // scalability: spatial + aux
  bw.w(0, 3); // dimension_id_len[0] = 1
  bw.w(0, 3); // dimension_id_len[1] = 1
  bw.flag(1); // nuh_layer_id_present
  bw.w(1, 6); // layer_id_in_nuh[1] = 1
  bw.w(1, 1); // dimension_id[1][0] = 1
  bw.w(1, 1); // dimension_id[1][1] = AUX_ALPHA
  bw.w(0, 4); // view_id_len = 0

  bw.flag(0); // direct_dependency_flag[1][0]
  bw.ue(0); // num_add_layer_sets
  bw.flag(0); // sub_layers_max_minus1_present
  bw.flag(0); // max_tid_ref_present
  bw.flag(0); // default_ref_layers_active

  // FFmpeg loops from index 2 to nb_ptl-1, so nptl_m1=2 → 1 entry at index 2
  bw.ue(2); // vps_num_profile_tier_level_minus1
  bw.flag(1); // profile_present_flag[2]
  bw.copy(ptl.ptlBits, ptl.ptlStart, ptl.ptlEnd - ptl.ptlStart);

  bw.ue(0); // num_add_olss
  bw.w(0, 2); // default_output_layer_idc
  bw.w(1, 2); // ptl_idx[1][0] = 1 (ceil_log2(3) = 2 bits)
  bw.w(2, 2); // ptl_idx[1][1] = 2

  bw.ue(0); // vps_num_rep_formats_minus1
  bw.w(width, 16);
  bw.w(height, 16);
  bw.flag(1); // chroma_and_bit_depth_vps_present
  bw.w(1, 2); // chroma_format_idc = 4:2:0
  bw.w(0, 4); // bit_depth_luma_minus8
  bw.w(0, 4); // bit_depth_chroma_minus8
  bw.flag(0); // conformance_window_vps_flag

  bw.flag(1); // max_one_active_ref_layer
  bw.flag(0); // poc_lsb_aligned
  bw.flag(1); // poc_lsb_not_present

  // DPB for OLS 1 (2 layers, 1 sub-layer)
  bw.flag(0); // sub_layer_flag_info_present
  bw.ue(0); // max_dec_pic_buffering (layer 0)
  bw.ue(0); // max_dec_pic_buffering (layer 1)
  bw.ue(0); // max_num_reorder_pics
  bw.ue(0); // max_latency_increase

  bw.ue(0); // direct_dep_type_len_minus2
  bw.flag(0); // default_direct_dependency_flag
  bw.ue(0); // non_vui_extension_length
  bw.flag(0); // vps_vui_present
  bw.flag(0); // vps_extension2_flag
}

/**
 * Build a complete alpha VPS from scratch, using the original NVENC VPS
 * only as a source for the PTL (profile/tier/level) bytes.
 * Matches x265 4.1 ENABLE_ALPHA VPS structure.
 */
export function buildAlphaVPS(vpsData: Buffer, width: number, height: number): Buffer {
  const ptl = extractPTL(vpsData);
  if (!ptl) return vpsData;

  const bw = new BitWriter();
  writeBaseVPS(bw, ptl);
  writeVPSExtension(bw, ptl, width, height);

  bw.bits.push(1); // RBSP stop bit
  bw.align(0);
  return addEmulationPrevention(packBits(bw.bits));
}
