// Patch NVENC output to conform to Apple HEVC Video with Alpha Interoperability Profile.
// Spec: https://developer.apple.com/av-foundation/HEVC-Video-with-Alpha-Interoperability-Profile.pdf
// Slice parser is config-driven: NvencHevcConfig from parse.ts derives flags at encoder init.

import { BitReader, BitWriter, packBits } from "./bit";
import {
  ANNEX_B_START_CODE,
  addEmulationPrevention,
  NAL_BLA_W_LP,
  NAL_RSV_IRAP_VCL23,
  NAL_SPS,
  NAL_VPS,
  removeEmulationPrevention,
  splitNalUnits,
} from "./nal";
import type { NvencHevcConfig } from "./parser";

// PTL bit offsets within emulation-prevention-stripped NAL (NAL header included).
const VPS_PTL_BIT = 48; // 16 (NAL hdr) + 32 (VPS prefix)
const SPS_PTL_BIT = 24; // 16 (NAL hdr) + 8 (SPS prefix)
const PTL_TIER_BIT = 2;
const PTL_COMPAT2_BIT = 10; // profile_space(2) + tier(1) + idc(5) + compat[0,1](2)
const SLICE_TYPE_B = 0;
const SLICE_TYPE_P = 1;

function setBit(buf: Buffer, bitOffset: number, value: 0 | 1): void {
  const byte = bitOffset >> 3;
  const mask = 1 << (7 - (bitOffset & 7));
  const cur = buf[byte] ?? 0;
  buf[byte] = value ? cur | mask : cur & ~mask;
}

function patchPtl(nalData: Buffer, ptlStartBit: number): Buffer {
  const rbsp = removeEmulationPrevention(nalData);
  setBit(rbsp, ptlStartBit + PTL_TIER_BIT, 0);
  setBit(rbsp, ptlStartBit + PTL_COMPAT2_BIT, 1);
  return addEmulationPrevention(rbsp);
}

/** Patch every VPS/SPS NAL in an Annex B bitstream so PTL matches Apple/x265. */
export function patchHevcAlphaPtl(bitstream: Buffer): Buffer {
  const nals = splitNalUnits(bitstream);
  if (nals.length === 0) return bitstream;
  const chunks: Buffer[] = [];
  for (const nal of nals) {
    let data = nal.data;
    if (nal.type === NAL_VPS) data = patchPtl(nal.data, VPS_PTL_BIT);
    else if (nal.type === NAL_SPS) data = patchPtl(nal.data, SPS_PTL_BIT);
    chunks.push(ANNEX_B_START_CODE, data);
  }
  return Buffer.concat(chunks);
}

// ─── ue(v) rewrite helpers (SPS/PPS — RBSP can grow freely, no CABAC trailing) ──

function rewriteOneUe(nalIn: Buffer, bitOffset: number, newVal: number): Buffer {
  const rbsp = removeEmulationPrevention(nalIn);
  const br = new BitReader(rbsp);
  const bw = new BitWriter();
  for (let i = 0; i < bitOffset; i++) bw.bits.push(br.read(1));
  br.readUe();
  bw.ue(newVal);
  while (br.pos < br.bits.length) bw.bits.push(br.read(1));
  while (bw.bits.length % 8 !== 0) bw.bits.push(0);
  return addEmulationPrevention(packBits(bw.bits));
}

function rewriteTwoUe(nalIn: Buffer, bitOffset: number, newVal1: number, newVal2: number): Buffer {
  const rbsp = removeEmulationPrevention(nalIn);
  const br = new BitReader(rbsp);
  const bw = new BitWriter();
  for (let i = 0; i < bitOffset; i++) bw.bits.push(br.read(1));
  br.readUe();
  br.readUe();
  bw.ue(newVal1);
  bw.ue(newVal2);
  while (br.pos < br.bits.length) bw.bits.push(br.read(1));
  while (bw.bits.length % 8 !== 0) bw.bits.push(0);
  return addEmulationPrevention(packBits(bw.bits));
}

/** Alpha SPS: sps_seq_parameter_set_id 0 → 1. */
export function rewriteAlphaSps(sps: Buffer): Buffer {
  const SPS_SEQ_ID_BIT = SPS_PTL_BIT + 96; // PTL is 96 bits for our profile config
  return rewriteOneUe(sps, SPS_SEQ_ID_BIT, 1);
}

/** Alpha PPS: pps_pic_parameter_set_id 0 → 1, pps_seq_parameter_set_id 0 → 1. */
export function rewriteAlphaPps(pps: Buffer): Buffer {
  return rewriteTwoUe(pps, 16 /* after NAL header */, 1, 1);
}

// ─── Slice header rewrite (must preserve CABAC byte alignment) ──────────────

function readSe(br: BitReader): number {
  const ue = br.readUe();
  return ue & 1 ? (ue + 1) >> 1 : -(ue >> 1);
}

// Inline st_ref_pic_set when slice has short_term_ref_pic_set_sps_flag=0.
// stRpsIdx = num_short_term_ref_pic_sets so inter_ref_pic_set_prediction may use prev set.
function parseInlineStRefPicSet(br: BitReader, numDeltaPocsSet0: number): void {
  const interFlag = br.read(1); // inter_ref_pic_set_prediction_flag
  if (interFlag) {
    const deltaIdxMinus1 = br.readUe(); // stRpsIdx == num_short_term_ref_pic_sets → present
    if (deltaIdxMinus1 !== 0) throw new Error(`apple_alpha: unexpected delta_idx_minus1=${deltaIdxMinus1}`);
    br.read(1); // delta_rps_sign
    br.readUe(); // abs_delta_rps_minus1
    for (let j = 0; j <= numDeltaPocsSet0; j++) {
      const used = br.read(1);
      if (!used) br.read(1); // use_delta_flag
    }
  } else {
    const numNeg = br.readUe();
    const numPos = br.readUe();
    for (let i = 0; i < numNeg; i++) { br.readUe(); br.read(1); }
    for (let i = 0; i < numPos; i++) { br.readUe(); br.read(1); }
  }
}

/** Parse slice_segment_header up to byte_alignment. Returns bit position B (end of header content). */
function parseHeaderToAlignment(br: BitReader, nalType: number, cfg: NvencHevcConfig): number {
  br.read(16); // skip NAL header
  if (br.read(1) !== 1) throw new Error("apple_alpha: expected first_slice_segment_in_pic_flag=1");
  const isIrap = nalType >= NAL_BLA_W_LP && nalType <= NAL_RSV_IRAP_VCL23;
  if (isIrap) br.read(1); // no_output_of_prior_pics_flag
  br.readUe(); // slice_pic_parameter_set_id
  const sliceType = br.readUe();
  if (!isIrap) {
    br.read(cfg.log2MaxPocLsb); // slice_pic_order_cnt_lsb
    const stRefPicSetSpsFlag = br.read(1);
    if (!stRefPicSetSpsFlag) parseInlineStRefPicSet(br, cfg.numDeltaPocsSet0);
    else if (cfg.numShortTermRefPicSets > 1) br.read(Math.ceil(Math.log2(cfg.numShortTermRefPicSets)));
    if (cfg.longTermRefPicsPresent) throw new Error("apple_alpha: long_term_ref_pics path unimplemented");
    if (cfg.spsTemporalMvpEnabled) br.read(1); // slice_temporal_mvp_enabled_flag
  }
  if (cfg.saoEnabled) {
    br.read(1); // slice_sao_luma_flag
    br.read(1); // slice_sao_chroma_flag
  }
  if (sliceType === SLICE_TYPE_P || sliceType === SLICE_TYPE_B) {
    const overrideFlag = br.read(1);
    if (overrideFlag) {
      br.readUe();
      if (sliceType === SLICE_TYPE_B) br.readUe();
    }
    if (sliceType === SLICE_TYPE_B) br.read(1); // mvd_l1_zero_flag
    if (cfg.cabacInitPresent) br.read(1); // cabac_init_flag
    br.readUe(); // five_minus_max_num_merge_cand
  }
  readSe(br); // slice_qp_delta
  if (cfg.ppsHasLoopFilterAcrossSlicesFlag) br.read(1); // slice_loop_filter_across_slices_enabled_flag
  return br.pos;
}

/**
 * Rewrite alpha slice header: slice_pic_parameter_set_id 0 → 1.
 * The +2-bit shift is absorbed by emitting a fresh byte_alignment then appending the
 * original CABAC slice_segment_data bytes verbatim. CABAC byte boundary is preserved.
 */
export function rewriteAlphaSliceHeader(slice: Buffer, nalType: number, cfg: NvencHevcConfig): Buffer {
  const rbsp = removeEmulationPrevention(slice);
  const br = new BitReader(rbsp);

  const probe = new BitReader(rbsp);
  const B = parseHeaderToAlignment(probe, nalType, cfg);
  const oldAlignBits = B % 8 === 0 ? 8 : 8 - (B % 8);
  const sliceDataByteOffset = (B + oldAlignBits) / 8;

  const bw = new BitWriter();
  for (let i = 0; i < 16; i++) bw.bits.push(br.read(1)); // NAL header
  bw.bits.push(br.read(1)); // first_slice_segment_in_pic_flag
  const isIrap = nalType >= NAL_BLA_W_LP && nalType <= NAL_RSV_IRAP_VCL23;
  if (isIrap) bw.bits.push(br.read(1)); // no_output_of_prior_pics_flag

  br.readUe(); // discard old slice_pic_parameter_set_id
  bw.ue(1); // new slice_pic_parameter_set_id

  while (br.pos < B) bw.bits.push(br.read(1)); // copy rest of header bits

  bw.bits.push(1); // byte_alignment: rbsp_alignment_bit_one
  while (bw.bits.length % 8 !== 0) bw.bits.push(0);

  return addEmulationPrevention(Buffer.concat([packBits(bw.bits), rbsp.subarray(sliceDataByteOffset)]));
}
