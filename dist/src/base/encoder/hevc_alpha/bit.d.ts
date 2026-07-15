export declare function packBits(bits: number[]): Buffer;
export declare class BitWriter {
    bits: number[];
    w(val: number, n: number): void;
    flag(val: boolean | number): void;
    ue(val: number): void;
    align(pad: number): void;
    copy(src: number[], start: number, len: number): void;
}
export declare class BitReader {
    private _bits;
    pos: number;
    constructor(data: Buffer);
    get bits(): number[];
    read(n: number): number;
    readUe(): number;
}
