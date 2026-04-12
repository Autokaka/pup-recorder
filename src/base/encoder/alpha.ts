// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/12.

import {
  ANNEX_B_START_CODE,
  encodeNalHeader,
  NAL_HEADER_SIZE,
  type NalUnit,
  packBits,
  rewriteNalLayerId,
  splitNalUnits,
} from "./nal";

const NAL_UNIT_PREFIX_SEI = 39;

/**
 * Build unified extradata: base VPS (patched for alpha) + interleaved SPS/PPS.
 * Alpha SPS/PPS follow their base counterparts so the HVCC serializer
 * groups them into the same NAL array (required for multi-layer).
 */
export function buildUnifiedExtradata(baseExtradata: Buffer, alphaExtradata: Buffer): Buffer {
  const baseNals = splitNalUnits(baseExtradata);
  const alphaNals = splitNalUnits(alphaExtradata);

  const alphaByType = new Map<number, NalUnit[]>();
  for (const nal of alphaNals) {
    if (nal.type === 32) continue; // VPS is per-bitstream, not per-layer
    const arr = alphaByType.get(nal.type) ?? [];
    arr.push(nal);
    alphaByType.set(nal.type, arr);
  }

  const chunks: Buffer[] = [];
  const emitted = new Set<number>();
  for (const nal of baseNals) {
    // VPS needs alpha layer declaration for FFmpeg's HVCC serializer
    const data = nal.type === 32 ? patchVPSForAlpha(nal.data) : nal.data;
    chunks.push(ANNEX_B_START_CODE, data);
    if (!emitted.has(nal.type)) {
      emitted.add(nal.type);
      for (const alphaNal of alphaByType.get(nal.type) ?? []) {
        chunks.push(ANNEX_B_START_CODE, rewriteNalLayerId(alphaNal.data, 1));
      }
    }
  }

  // SEI must be in extradata for Apple's decoder to discover alpha channel
  chunks.push(buildAlphaChannelInfoSEI());

  return Buffer.concat(chunks);
}

/**
 * Patch a single-layer VPS to declare 2 layers with layer 1 = AUX_ALPHA.
 * FFmpeg 8.0's hvcc_parse_vps_extension reads this to set alpha_layer_nuh_id,
 * which allows layer_id=1 NALs to survive Annex B → HVCC conversion.
 */
function patchVPSForAlpha(vpsData: Buffer): Buffer {
  const rbsp = vpsData.subarray(NAL_HEADER_SIZE);

  let bitPos = 0;
  const readBits = (n: number): number => {
    let val = 0;
    for (let i = 0; i < n; i++) {
      const byteIdx = (bitPos + i) >> 3;
      const bitIdx = 7 - ((bitPos + i) & 7);
      val = (val << 1) | ((rbsp[byteIdx]! >> bitIdx) & 1);
    }
    bitPos += n;
    return val;
  };

  readBits(4); // vps_video_parameter_set_id
  const vpsBaseLayerInternalFlag = readBits(1);
  readBits(1); // vps_base_layer_available_flag
  const maxLayersPos = bitPos;
  const maxLayersMinus1 = readBits(6);

  if (maxLayersMinus1 > 0) return vpsData;

  const bits: number[] = [];
  for (let i = 0; i < vpsData.length; i++) {
    for (let b = 7; b >= 0; b--) bits.push((vpsData[i]! >> b) & 1);
  }

  const mlOffset = maxLayersPos + NAL_HEADER_SIZE * 8;
  for (let i = 0; i < 6; i++) bits[mlOffset + i] = 0;
  bits[mlOffset + 5] = 1; // vps_max_layers_minus1 = 1

  let lastBit = bits.length - 1;
  while (lastBit > 0 && bits[lastBit] === 0) lastBit--;
  if (lastBit <= 1) throw new Error("Invalid VPS: no RBSP stop bit");
  bits[lastBit - 1] = 1; // vps_extension_flag = 1
  bits.length = lastBit;

  while (bits.length % 8 !== 0) bits.push(1); // byte-align

  // Minimal VPS extension for FFmpeg's hvcc_parse_vps_extension
  if (vpsBaseLayerInternalFlag) {
    for (let i = 0; i < 8; i++) bits.push(0); // general_level_idc
  }
  bits.push(0); // splitting_flag
  for (let i = 0; i < 16; i++) bits.push(i === 3 ? 1 : 0); // scalability_mask: AuxId
  bits.push(0, 0, 0); // dimension_id_len_minus1 = 0
  bits.push(0); // vps_nuh_layer_id_present_flag
  bits.push(1); // dimension_id[1][0] = AUX_ALPHA

  bits.push(1);
  while (bits.length % 8 !== 0) bits.push(0);

  return packBits(bits);
}

/**
 * Build alpha_channel_info SEI message (payloadType=165).
 * Layout from x265 SEIAlphaChannelInfo::writeSEI.
 */
export function buildAlphaChannelInfoSEI(): Buffer {
  const payloadType = 165;
  const payloadSize = 4;
  const [h0, h1] = encodeNalHeader(NAL_UNIT_PREFIX_SEI, 0, 1);

  const bits: number[] = [];
  const writeBits = (val: number, n: number) => {
    for (let i = n - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };

  writeBits(0, 1); // alpha_channel_cancel_flag
  writeBits(0, 3); // alpha_channel_use_idc (straight alpha)
  writeBits(0, 3); // alpha_channel_bit_depth_minus8
  writeBits(0, 9); // alpha_transparent_value
  writeBits(255, 9); // alpha_opaque_value
  writeBits(0, 1); // alpha_channel_incr_flag
  writeBits(0, 1); // alpha_channel_clip_flag
  writeBits(1, 1); // byte alignment
  while (bits.length % 8 !== 0) writeBits(0, 1);

  return Buffer.concat([
    ANNEX_B_START_CODE,
    Buffer.from([h0, h1]),
    Buffer.from([payloadType, payloadSize]),
    packBits(bits),
    Buffer.from([0x80]),
  ]);
}

/** Interleave base and alpha NALs for a single frame. */
export function interleaveAccessUnits(baseNals: NalUnit[], alphaNals: NalUnit[]): Buffer {
  const chunks: Buffer[] = [];
  for (const nal of baseNals) {
    chunks.push(ANNEX_B_START_CODE, nal.data);
  }
  for (const nal of alphaNals) {
    if (nal.type < 32) {
      chunks.push(ANNEX_B_START_CODE, rewriteNalLayerId(nal.data, 1));
    }
  }
  return Buffer.concat(chunks);
}
