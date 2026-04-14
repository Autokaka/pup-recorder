// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/13.

export function packBits(bits: number[]): Buffer {
  const buf = Buffer.alloc(bits.length >> 3);
  for (let i = 0; i < buf.length; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) byte = (byte << 1) | bits[i * 8 + b]!;
    buf[i] = byte;
  }
  return buf;
}

export class BitWriter {
  bits: number[] = [];
  w(val: number, n: number) {
    for (let i = n - 1; i >= 0; i--) this.bits.push((val >> i) & 1);
  }
  flag(val: boolean | number) {
    this.bits.push(val ? 1 : 0);
  }
  ue(val: number) {
    const v = val + 1;
    const len = 32 - Math.clz32(v);
    for (let i = 0; i < len - 1; i++) this.bits.push(0);
    for (let i = len - 1; i >= 0; i--) this.bits.push((v >> i) & 1);
  }
  align(pad: number) {
    while (this.bits.length % 8 !== 0) this.bits.push(pad);
  }
  copy(src: number[], start: number, len: number) {
    for (let i = 0; i < len; i++) this.bits.push(src[start + i]!);
  }
}

export class BitReader {
  private _bits: number[];
  pos = 0;
  constructor(data: Buffer) {
    this._bits = [];
    for (let i = 0; i < data.length; i++) {
      for (let b = 7; b >= 0; b--) this._bits.push((data[i]! >> b) & 1);
    }
  }
  get bits() {
    return this._bits;
  }
  read(n: number): number {
    let val = 0;
    for (let i = 0; i < n; i++) val = (val << 1) | this._bits[this.pos++]!;
    return val;
  }
  readUe(): number {
    let zeros = 0;
    while (this._bits[this.pos] === 0) {
      zeros++;
      this.pos++;
    }
    this.pos++;
    let val = 1;
    for (let i = 0; i < zeros; i++) val = (val << 1) | this._bits[this.pos++]!;
    return val - 1;
  }
}
