import { AudioCodec } from 'mediabunny';
import { BrowserWindow } from 'electron';
import { ChildProcess } from 'child_process';
import type { Debugger } from 'electron';
import type { EncodedAudioChunk as EncodedAudioChunk_2 } from '@napi-rs/webcodecs';
import type { EncodedAudioChunkMetadataJs } from '@napi-rs/webcodecs';
import { EncodedPacket } from 'mediabunny';
import type { EncodedVideoChunk as EncodedVideoChunk_2 } from '@napi-rs/webcodecs';
import type { EncodedVideoChunkMetadataJs } from '@napi-rs/webcodecs';
import { IsobmffOutputFormat } from 'mediabunny';
import type { NativeImage } from 'electron';
import { OutputFormat } from 'mediabunny';
import { Size } from 'electron';
import { SpawnOptions } from 'child_process';
import { StreamTarget } from 'mediabunny';
import { VideoCodec } from 'mediabunny';
import { WebMOutputFormat } from 'mediabunny';
import z from 'zod';

declare class AbortLink {
    readonly query?: AbortQuery | undefined;
    readonly interval: number;
    private _callback?;
    private _aborted?;
    private _stopped;
    private constructor();
    static start(query?: AbortQuery, interval?: number): AbortLink;
    get aborted(): boolean | undefined;
    get stopped(): boolean;
    onAbort(callback: AsyncTask): Promise<void>;
    wait(...handles: ProcessHandle[]): Promise<unknown>;
    stop(): void;
    private tick;
}
export { AbortLink }
export { AbortLink as AbortLink_alias_1 }

declare type AbortQuery = () => Promise<boolean> | boolean;
export { AbortQuery }
export { AbortQuery as AbortQuery_alias_1 }

export declare function advanceVirtualTime(cdp: Debugger, budget: number): Promise<void>;

export declare const app: string | undefined;

declare type AsyncTask = () => Promise<void> | void;
export { AsyncTask }
export { AsyncTask as AsyncTask_alias_1 }

export declare interface AudioCapture {
    teardown(): Promise<void>;
}

declare interface AudioChunk {
    data: Uint8Array;
    type: EncodedAudioChunk_2["type"];
    timestampS: number;
    durationS: number;
}

export declare const basedir: string;

export declare interface BgraConverter {
    new (width: number, height: number, numThreads?: number): BgraConverter;
    convert(bgra: Buffer): Promise<Buffer>;
}

export declare const BgraConverter: BgraConverter;

export declare function buildRust(): Promise<void>;

export declare function buildWrapperHTML(targetURL: string, size: Size): string;

export declare const canIUseGPU: Promise<boolean>;

export declare function checkHTML(source: string): void;

export declare type CLICallback = (source: string, options: RenderOptions) => Promise<unknown>;

declare class ConcurrencyLimiter {
    readonly maxConcurrency: number;
    private _active;
    private _queue;
    private _ended;
    constructor(maxConcurrency: number);
    get active(): number;
    get pending(): number;
    get stats(): string;
    schedule<T>(fn: () => Promise<T>): Promise<T>;
    end(): Promise<void>;
    private next;
}
export { ConcurrencyLimiter }
export { ConcurrencyLimiter as ConcurrencyLimiter_alias_1 }

declare const createMovMuxer: (opts: MuxerOptions) => HEVCIsobmffMuxer;
export { createMovMuxer }
export { createMovMuxer as createMovMuxer_alias_1 }

declare const createMp4Muxer: (opts: MuxerOptions) => HEVCIsobmffMuxer;
export { createMp4Muxer }
export { createMp4Muxer as createMp4Muxer_alias_1 }

export declare function decodeTimestamp(bitmap: Buffer, size: Size): number | undefined;

declare const DEFAULT_DURATION = 5;
export { DEFAULT_DURATION }
export { DEFAULT_DURATION as DEFAULT_DURATION_alias_1 }

declare const DEFAULT_FPS = 30;
export { DEFAULT_FPS }
export { DEFAULT_FPS as DEFAULT_FPS_alias_1 }

declare const DEFAULT_HEIGHT = 1080;
export { DEFAULT_HEIGHT }
export { DEFAULT_HEIGHT as DEFAULT_HEIGHT_alias_1 }

declare const DEFAULT_OUT_DIR = "out";
export { DEFAULT_OUT_DIR }
export { DEFAULT_OUT_DIR as DEFAULT_OUT_DIR_alias_1 }

declare const DEFAULT_WIDTH = 1920;
export { DEFAULT_WIDTH }
export { DEFAULT_WIDTH as DEFAULT_WIDTH_alias_1 }

export declare function electronOpts(): Promise<string[]>;

export declare class EncoderPipeline {
    private readonly _entries;
    private readonly _encoders;
    private readonly _converter;
    private readonly _width;
    private readonly _height;
    private readonly _fps;
    private _frameIndex;
    private _sampleRate;
    constructor({ width, height, fps, formats, outDir, withAudio }: EncoderPipelineOptions);
    setupAudio(sampleRate: number): void;
    encodeFrame(bgra: Buffer, timestampUs: number): Promise<void>;
    encodeAudio(pcm: Buffer): void;
    flush(): Promise<void>;
    finalize(): Promise<Partial<Record<VideoFormat, string>>>;
}

export declare interface EncoderPipelineOptions {
    width: number;
    height: number;
    fps: number;
    formats: VideoFormat[];
    outDir: string;
    withAudio?: boolean;
}

declare type EnvParser<T> = (value: unknown) => T;
export { EnvParser }
export { EnvParser as EnvParser_alias_1 }

declare function exec(cmd: string, options?: SpawnOptions): ProcessHandle;
export { exec }
export { exec as exec_alias_1 }

export declare const FRAME_SYNC_MARKER_HEIGHT = 1;

export declare const FRAME_SYNC_MARKER_WIDTH = 32;

declare class HEVCIsobmffMuxer extends MediaMuxer {
    private readonly _format;
    constructor(opts: MuxerOptions, _format: IsobmffOutputFormat);
    protected get format(): IsobmffOutputFormat;
    protected get videoCodec(): VideoCodec;
    protected get audioCodec(): AudioCodec;
    protected get audioDecoderCodec(): string;
    protected get videoConfig(): EncodedVideoChunkMetadata["decoderConfig"];
    protected makeVideoPacket({ data, type, timestampS, durationS }: VideoChunk, isFirst: boolean): EncodedPacket;
}

export declare function isEmpty(image: NativeImage): boolean;

declare function isVideoFormat(s: string): s is VideoFormat;
export { isVideoFormat }
export { isVideoFormat as isVideoFormat_alias_1 }

declare class Lazy<T> {
    readonly makeValue: () => T;
    constructor(makeValue: () => T);
    get value(): T;
    get initialized(): boolean;
    private _initialized;
    private _value;
}
export { Lazy }
export { Lazy as Lazy_alias_1 }

export declare function loadWindow(source: string, options: RenderOptions): Promise<BrowserWindow>;

declare class Logger implements LoggerLike {
    private _level;
    private _impl?;
    get level(): number;
    set level(value: number);
    get impl(): LoggerLike | undefined;
    set impl(value: LoggerLike);
    constructor(_level?: number);
    debug(...messages: unknown[]): void;
    info(...messages: unknown[]): void;
    warn(...messages: unknown[]): void;
    error(...messages: unknown[]): void;
    fatal(...messages: unknown[]): void;
    private dispatch;
    attach(proc: ChildProcess, name: string): Promise<void>;
}
export { Logger }
export { Logger as Logger_alias_1 }

declare const logger: Logger;
export { logger }
export { logger as logger_alias_1 }

declare interface LoggerLike {
    debug?(this: void, ...messages: unknown[]): void;
    info?(this: void, ...messages: unknown[]): void;
    warn?(this: void, ...messages: unknown[]): void;
    error?(this: void, ...messages: unknown[]): void;
}
export { LoggerLike }
export { LoggerLike as LoggerLike_alias_1 }

export declare function makeCLI(name: string, callback: CLICallback): Promise<void>;

declare abstract class MediaMuxer {
    protected readonly opts: MuxerOptions;
    protected videoDesc?: Uint8Array;
    private _chain;
    private _videoSrc;
    private _audioSrc?;
    private _output;
    private _firstVideo;
    private _firstAudio;
    protected abstract get format(): OutputFormat;
    protected abstract get videoCodec(): VideoCodec;
    protected abstract get audioCodec(): AudioCodec;
    protected abstract get audioDecoderCodec(): string;
    protected abstract get videoConfig(): EncodedVideoChunkMetadata["decoderConfig"];
    protected abstract makeVideoPacket(chunk: VideoChunk, isFirst: boolean): EncodedPacket;
    constructor(opts: MuxerOptions);
    private init;
    addVideoChunk(raw: EncodedVideoChunk_2, meta?: EncodedVideoChunkMetadataJs): void;
    addAudioChunk(raw: EncodedAudioChunk_2, meta?: EncodedAudioChunkMetadataJs): void;
    finalize(): Promise<string>;
}
export { MediaMuxer }
export { MediaMuxer as MediaMuxer_alias_1 }

declare interface MuxerOptions {
    width: number;
    height: number;
    fps: number;
    outPath: string;
    withAudio?: boolean;
}
export { MuxerOptions }
export { MuxerOptions as MuxerOptions_alias_1 }

export declare interface NetworkOptions {
    source: string;
    window: BrowserWindow;
    useInnerProxy?: boolean;
}

declare function noerr<Fn extends (...args: any[]) => any, D>(fn: Fn, defaultValue: D): (...args: Parameters<Fn>) => ReturnType<Fn> | D;
export { noerr }
export { noerr as noerr_alias_1 }

declare const openFileStreamTarget: (path: string) => Promise<StreamTarget>;
export { openFileStreamTarget }
export { openFileStreamTarget as openFileStreamTarget_alias_1 }

declare function pargs(): string[];
export { pargs }
export { pargs as pargs_alias_1 }

declare function parseNumber(x: unknown): number;
export { parseNumber }
export { parseNumber as parseNumber_alias_1 }

declare function parseString(x: unknown): string;
export { parseString }
export { parseString as parseString_alias_1 }

declare function penv<T>(name: string, parser: EnvParser<T>, defaultValue: T): T;

declare function penv<T>(name: string, parser: EnvParser<T>, defaultValue?: T): T | undefined;
export { penv }
export { penv as penv_alias_1 }

declare function periodical(callback: (count: number) => Promise<void> | void, ms: number): () => void;
export { periodical }
export { periodical as periodical_alias_1 }

declare interface ProcessHandle {
    process: ChildProcess;
    wait: Promise<void>;
}
export { ProcessHandle }
export { ProcessHandle as ProcessHandle_alias_1 }

export declare function proxiedUrl(url: string): string;

declare function pup(source: string, options: PupOptions): Promise<PupResult>;
export { pup }
export { pup as pup_alias_1 }

declare const PUP_ARGS_KEY = "--pup-priv-args";
export { PUP_ARGS_KEY }
export { PUP_ARGS_KEY as PUP_ARGS_KEY_alias_1 }

declare const pupDisableGPU: boolean;
export { pupDisableGPU }
export { pupDisableGPU as pupDisableGPU_alias_1 }

declare const pupLogLevel: number;
export { pupLogLevel }
export { pupLogLevel as pupLogLevel_alias_1 }

declare interface PupOptions extends Partial<RenderOptions> {
    cancelQuery?: AbortQuery;
    onProgress?: PupProgressCallback;
}
export { PupOptions }
export { PupOptions as PupOptions_alias_1 }

declare type PupProgressCallback = (progress: number) => Promise<void> | void;
export { PupProgressCallback }
export { PupProgressCallback as PupProgressCallback_alias_1 }

declare interface PupResult extends RenderResult {
}
export { PupResult }
export { PupResult as PupResult_alias_1 }

declare const pupUseInnerProxy: boolean;
export { pupUseInnerProxy }
export { pupUseInnerProxy as pupUseInnerProxy_alias_1 }

export declare function render(source: string, options: RenderOptions): Promise<void>;

declare type RenderOptions = z.infer<typeof RenderSchema>;
export { RenderOptions }
export { RenderOptions as RenderOptions_alias_1 }

declare interface RenderResult {
    options: RenderOptions;
    written: number;
    files: VideoFiles;
}
export { RenderResult }
export { RenderResult as RenderResult_alias_1 }

declare const RenderSchema: z.ZodObject<{
    duration: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    width: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    height: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    fps: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    formats: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodEnum<{
        mp4: "mp4";
        mov: "mov";
        webm: "webm";
    }>>>>;
    withAudio: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    outDir: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    useInnerProxy: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    deterministic: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export { RenderSchema }
export { RenderSchema as RenderSchema_alias_1 }

declare interface RetryOptions<Args extends any[], Ret> {
    fn: (...args: Args) => Promise<Ret>;
    maxAttempts?: number;
    timeout?: number;
}
export { RetryOptions }
export { RetryOptions as RetryOptions_alias_1 }

export declare function runElectronApp(size: Size, args: unknown[]): Promise<ProcessHandle>;

export declare function setInterceptor({ source, window, useInnerProxy }: NetworkOptions): void;

export declare function setupAudioCapture(pipeline: EncoderPipeline): Promise<AudioCapture>;

export declare function shoot(source: string, options: RenderOptions): Promise<void>;

declare function sleep(ms: number): Promise<void>;
export { sleep }
export { sleep as sleep_alias_1 }

export declare function startSync(cdp: Debugger): Promise<any>;

export declare function stopSync(cdp: Debugger): Promise<any>;

declare const toPacket: ({ data, type, timestampS, durationS }: VideoChunk | AudioChunk) => EncodedPacket;
export { toPacket }
export { toPacket as toPacket_alias_1 }

export declare function unsetInterceptor(window: BrowserWindow): void;

declare function useRetry<Args extends any[], Ret>({ fn, maxAttempts, timeout }: RetryOptions<Args, Ret>): (...args: Args) => Promise<Ret>;
export { useRetry }
export { useRetry as useRetry_alias_1 }

declare const VIDEO_FORMATS: readonly ["mp4", "mov", "webm"];
export { VIDEO_FORMATS }
export { VIDEO_FORMATS as VIDEO_FORMATS_alias_1 }

declare interface VideoChunk {
    data: Uint8Array;
    alphaSideData?: Uint8Array;
    type: EncodedVideoChunk_2["type"];
    timestampS: number;
    durationS: number;
}
export { VideoChunk }
export { VideoChunk as VideoChunk_alias_1 }

declare interface VideoFiles {
    cover: string;
    mp4?: string;
    mov?: string;
    webm?: string;
}
export { VideoFiles }
export { VideoFiles as VideoFiles_alias_1 }

declare type VideoFormat = (typeof VIDEO_FORMATS)[number];
export { VideoFormat }
export { VideoFormat as VideoFormat_alias_1 }

export declare class WaitableEvent {
    private _promise?;
    private _resolve?;
    private _timeoutToken?;
    wait(options?: WaitOptions): Promise<void>;
    signal(): void;
}

export declare interface WaitOptions {
    timeout: number;
    onTimeout?: () => void;
}

declare class WebMMuxer extends MediaMuxer {
    protected get format(): WebMOutputFormat;
    protected get videoCodec(): VideoCodec;
    protected get audioCodec(): AudioCodec;
    protected get audioDecoderCodec(): string;
    protected get videoConfig(): EncodedVideoChunkMetadata["decoderConfig"];
    protected makeVideoPacket(chunk: VideoChunk): EncodedPacket;
}
export { WebMMuxer }
export { WebMMuxer as WebMMuxer_alias_1 }

export { }
