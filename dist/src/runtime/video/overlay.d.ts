type Vec4 = [number, number, number, number];
export declare function syncOverlay(video: HTMLVideoElement, cv: HTMLCanvasElement): boolean;
export declare function setupCanvas(video: HTMLVideoElement, snap: OffscreenCanvas | undefined): HTMLCanvasElement;
export declare function fitRect(srcW: number, srcH: number, dstW: number, dstH: number, fit: string): Vec4;
export {};
