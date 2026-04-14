// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/12.

import { packBits } from "./bit";
import { ANNEX_B_START_CODE, encodeNalHeader, type NalUnit, rewriteNalLayerId, splitNalUnits } from "./nal";
import { buildAlphaVPS } from "./vps";

const NAL_UNIT_PREFIX_SEI = 39;

export interface UnifiedExtradataOptions {
  baseExtradata: Buffer;
  alphaExtradata: Buffer;
  width: number;
  height: number;
}

export function buildUnifiedExtradata(opts: UnifiedExtradataOptions): Buffer {
  const { baseExtradata, alphaExtradata } = opts;
  const baseNals = splitNalUnits(baseExtradata);
  const alphaNals = splitNalUnits(alphaExtradata);

  const alphaByType = new Map<number, NalUnit[]>();
  for (const nal of alphaNals) {
    if (nal.type === 32) continue;
    const arr = alphaByType.get(nal.type) ?? [];
    arr.push(nal);
    alphaByType.set(nal.type, arr);
  }

  const chunks: Buffer[] = [];
  const emitted = new Set<number>();
  for (const nal of baseNals) {
    const data = nal.type === 32 ? buildAlphaVPS(nal.data, opts.width, opts.height) : nal.data;
    chunks.push(ANNEX_B_START_CODE, data);
    if (!emitted.has(nal.type)) {
      emitted.add(nal.type);
      for (const alphaNal of alphaByType.get(nal.type) ?? []) {
        chunks.push(ANNEX_B_START_CODE, rewriteNalLayerId(alphaNal.data, 1));
      }
    }
  }

  chunks.push(buildAlphaChannelInfoSEI());
  return Buffer.concat(chunks);
}

export function buildAlphaChannelInfoSEI(): Buffer {
  const payloadType = 165;
  const payloadSize = 4;
  const [h0, h1] = encodeNalHeader(NAL_UNIT_PREFIX_SEI, 0, 1);

  const bits: number[] = [];
  const writeBits = (val: number, n: number) => {
    for (let i = n - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };

  writeBits(0, 1); // alpha_channel_cancel_flag
  writeBits(0, 3); // alpha_channel_use_idc
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
