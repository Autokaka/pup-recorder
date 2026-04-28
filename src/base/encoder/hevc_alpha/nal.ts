// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/12.

const NAL_HEADER_SIZE = 2;
const ANNEX_B_START_CODE = Buffer.from([0x00, 0x00, 0x00, 0x01]);

export { ANNEX_B_START_CODE, NAL_HEADER_SIZE };

// HEVC NAL unit types (T-REC-H.265 Table 7-1)
export const NAL_BLA_W_LP = 16;
export const NAL_IDR_W_RADL = 19;
export const NAL_IDR_N_LP = 20;
export const NAL_RSV_IRAP_VCL23 = 23;
export const NAL_VPS = 32;
export const NAL_SPS = 33;
export const NAL_PPS = 34;
export const NAL_SEI_PREFIX = 39;
export const NAL_SEI_SUFFIX = 40;

export interface NalUnit {
  type: number;
  layerId: number;
  data: Buffer;
}

function parseNalType(header0: number, header1: number): { type: number; layerId: number; temporalId: number } {
  const type = (header0 >> 1) & 0x3f;
  const layerId = ((header0 & 1) << 5) | ((header1 >> 3) & 0x1f);
  const temporalId = header1 & 0x07;
  return { type, layerId, temporalId };
}

export function encodeNalHeader(type: number, layerId: number, temporalId: number): [number, number] {
  const byte0 = ((type & 0x3f) << 1) | ((layerId >> 5) & 1);
  const byte1 = ((layerId & 0x1f) << 3) | (temporalId & 0x07);
  return [byte0, byte1];
}

/** Split Annex B bitstream into NAL units. */
export function splitNalUnits(bitstream: Buffer): NalUnit[] {
  const nals: NalUnit[] = [];
  let i = 0;

  while (i < bitstream.length) {
    let scLen = 0;
    if (i + 3 < bitstream.length && bitstream[i] === 0 && bitstream[i + 1] === 0 && bitstream[i + 2] === 1) {
      scLen = 3;
    } else if (
      i + 4 < bitstream.length &&
      bitstream[i] === 0 &&
      bitstream[i + 1] === 0 &&
      bitstream[i + 2] === 0 &&
      bitstream[i + 3] === 1
    ) {
      scLen = 4;
    } else {
      i++;
      continue;
    }

    const nalStart = i + scLen;
    if (nalStart + NAL_HEADER_SIZE > bitstream.length) break;

    let nalEnd = bitstream.length;
    for (let j = nalStart + NAL_HEADER_SIZE; j < bitstream.length - 2; j++) {
      if (
        bitstream[j] === 0 &&
        bitstream[j + 1] === 0 &&
        (bitstream[j + 2] === 1 || (j + 3 < bitstream.length && bitstream[j + 2] === 0 && bitstream[j + 3] === 1))
      ) {
        nalEnd = j;
        break;
      }
    }

    const { type, layerId } = parseNalType(bitstream[nalStart]!, bitstream[nalStart + 1]!);
    nals.push({ type, layerId, data: bitstream.subarray(nalStart, nalEnd) });
    i = nalEnd;
  }

  return nals;
}

/** Rewrite nuh_layer_id in a NAL unit (returns copy). */
export function rewriteNalLayerId(nal: Buffer, layerId: number): Buffer {
  const out = Buffer.from(nal);
  const { type, temporalId } = parseNalType(out[0]!, out[1]!);
  const [b0, b1] = encodeNalHeader(type, layerId, temporalId);
  out[0] = b0;
  out[1] = b1;
  return out;
}

/** Rewrite nal_unit_type in a NAL unit (returns copy). */
export function rewriteNalType(nal: Buffer, newType: number): Buffer {
  const out = Buffer.from(nal);
  const { layerId, temporalId } = parseNalType(out[0]!, out[1]!);
  const [b0, b1] = encodeNalHeader(newType, layerId, temporalId);
  out[0] = b0;
  out[1] = b1;
  return out;
}

/** Remove emulation prevention bytes (00 00 03 → 00 00) from RBSP. */
export function removeEmulationPrevention(data: Buffer): Buffer {
  const out: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i + 2 < data.length && data[i] === 0 && data[i + 1] === 0 && data[i + 2] === 3) {
      out.push(0, 0);
      i += 2;
    } else {
      out.push(data[i]!);
    }
  }
  return Buffer.from(out);
}

/** Insert emulation prevention bytes (00 00 03) for Annex B compliance. */
export function addEmulationPrevention(nal: Buffer): Buffer {
  const out: number[] = [];
  out.push(nal[0]!, nal[1]!);
  let zeros = 0;
  for (let i = 2; i < nal.length; i++) {
    if (zeros === 2 && nal[i]! <= 3) {
      out.push(3);
      zeros = 0;
    }
    if (nal[i] === 0) zeros++;
    else zeros = 0;
    out.push(nal[i]!);
  }
  return Buffer.from(out);
}
