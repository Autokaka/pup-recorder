export interface StubEncodeOptions {
    width: number;
    height: number;
    duration: number;
}
export declare function encodeStubWebm({ width, height, duration }: StubEncodeOptions): Promise<Buffer>;
