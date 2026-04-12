// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/12.

const NAL_HEADER_SIZE = 2;
const ANNEX_B_START_CODE = Buffer.from([0x00, 0x00, 0x00, 0x01]);

export { ANNEX_B_START_CODE, NAL_HEADER_SIZE };

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

export function packBits(bits: number[]): Buffer {
  const buf = Buffer.alloc(bits.length >> 3);
  for (let i = 0; i < buf.length; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) byte = (byte << 1) | bits[i * 8 + b]!;
    buf[i] = byte;
  }
  return buf;
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
