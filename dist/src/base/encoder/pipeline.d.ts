export interface EncoderPipelineOptions {
    width: number;
    height: number;
    fps: number;
    outFiles: string[];
    withAudio?: boolean;
    disableHwCodec?: boolean;
}
export declare class EncoderPipeline {
    private _s;
    private _disposed;
    private constructor();
    static create(opts: EncoderPipelineOptions): Promise<EncoderPipeline>;
    setupAudio(sampleRate: number): void;
    encodeBGRA(input: Buffer): Promise<void>;
    encodePNG(pngData: Buffer): Promise<void>;
    encodeAudio(pcm: Buffer): Promise<void>;
    finish(): Promise<string[]>;
    [Symbol.asyncDispose](): Promise<void>;
    private free;
    private bgraFrame;
}
