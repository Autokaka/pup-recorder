/**
 * Build a complete alpha VPS from scratch, using the original NVENC VPS
 * only as a source for the PTL (profile/tier/level) bytes.
 * Matches x265 4.1 ENABLE_ALPHA VPS structure.
 */
export declare function buildAlphaVPS(vpsData: Buffer, width: number, height: number): Buffer;
