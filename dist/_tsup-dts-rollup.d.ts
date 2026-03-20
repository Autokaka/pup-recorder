import { AV_PIX_FMT_YUV420P } from 'node-av/constants';
import { AV_PIX_FMT_YUVA420P } from 'node-av/constants';
import { AV_SAMPLE_FMT_FLT } from 'node-av/constants';
import { AV_SAMPLE_FMT_FLTP } from 'node-av/constants';
import { BrowserWindow } from 'electron';
import { ChildProcess } from 'child_process';
import { CodecContext } from 'node-av';
import type { Debugger } from 'electron';
import { FFAudioEncoder } from 'node-av/constants';
import { FFVideoEncoder } from 'node-av/constants';
import { FormatContext } from 'node-av';
import type { NativeImage } from 'electron';
import { Packet } from 'node-av';
import { Rational } from 'node-av';
import { Size } from 'electron';
import { SpawnOptions } from 'child_process';
import { Stream } from 'node-av';
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

declare class AudioEncoder_2 implements Disposable {
    private readonly _ctx;
    private readonly _stream;
    private readonly _outRate;
    private readonly _outFmt;
    private readonly _frameSize;
    private readonly _pkt;
    private readonly _filterFrame;
    private _graph?;
    private _bufSrc?;
    private _bufSink?;
    private _inRate?;
    pts: bigint;
    private constructor();
    static create(opts: AudioEncoderOptions): Promise<AudioEncoder_2>;
    /** Called once when audio-meta arrives with the page's actual sample rate. */
    setInputRate(inSampleRate: number): void;
    get stream(): Stream;
    get timeBase(): Rational;
    encode(pcm: Buffer, muxer: FormatMuxer): Promise<void>;
    flush(muxer: FormatMuxer): Promise<void>;
    [Symbol.dispose](): void;
    /** Drain filter → send to codec → drain codec packets. */
    private _drainFilter;
    /** Drain codec packets to muxer. */
    private _drainCodec;
    private _disposeGraph;
}
export { AudioEncoder_2 as AudioEncoder }

export declare interface AudioEncoderOptions {
    outSampleRate: number;
    outSampleFmt: typeof AV_SAMPLE_FMT_FLT | typeof AV_SAMPLE_FMT_FLTP;
    codecName: FFAudioEncoder;
    globalHeader: boolean;
    bitrate: number;
    muxer: FormatMuxer;
}

export declare const basedir: string;

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

declare class EncoderPipeline {
    private readonly _states;
    private constructor();
    static create({ width, height, fps, formats, outDir, withAudio, videoBitrate, audioBitrate, }: EncoderPipelineOptions): Promise<EncoderPipeline>;
    setupAudio(sampleRate: number): void;
    encodeFrame(bgra: Buffer, _timestampUs: number): Promise<void>;
    encodeAudio(pcm: Buffer): Promise<void>;
    finish(): Promise<EncoderResult>;
}
export { EncoderPipeline }
export { EncoderPipeline as EncoderPipeline_alias_1 }

declare interface EncoderPipelineOptions {
    width: number;
    height: number;
    fps: number;
    formats: VideoFormat[];
    outDir: string;
    withAudio?: boolean;
    videoBitrate?: number;
    audioBitrate?: number;
}
export { EncoderPipelineOptions }
export { EncoderPipelineOptions as EncoderPipelineOptions_alias_1 }

declare type EncoderResult = Partial<Record<VideoFormat, string>>;
export { EncoderResult }
export { EncoderResult as EncoderResult_alias_1 }

declare type EnvParser<T> = (value: unknown) => T;
export { EnvParser }
export { EnvParser as EnvParser_alias_1 }

declare function exec(cmd: string, options?: SpawnOptions): ProcessHandle;
export { exec }
export { exec as exec_alias_1 }

declare class FormatMuxer {
    private readonly _ctx;
    private _opened;
    constructor(outPath: string);
    addStream(codecCtx: CodecContext, codecTag?: string): ReturnType<FormatContext["newStream"]>;
    open(): Promise<void>;
    writePacket(pkt: Packet): Promise<void>;
    finish(): Promise<void>;
    [Symbol.asyncDispose](): Promise<void>;
}
export { FormatMuxer }
export { FormatMuxer as FormatMuxer_alias_1 }

export declare const FRAME_SYNC_MARKER_HEIGHT = 1;

export declare const FRAME_SYNC_MARKER_WIDTH = 32;

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

export declare interface NetworkOptions {
    source: string;
    window: BrowserWindow;
    useInnerProxy?: boolean;
}

declare function noerr<Fn extends (...args: any[]) => any, D>(fn: Fn, defaultValue: D): (...args: Parameters<Fn>) => ReturnType<Fn> | D;
export { noerr }
export { noerr as noerr_alias_1 }

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

export declare function unsetInterceptor(window: BrowserWindow): void;

declare function useRetry<Args extends any[], Ret>({ fn, maxAttempts, timeout }: RetryOptions<Args, Ret>): (...args: Args) => Promise<Ret>;
export { useRetry }
export { useRetry as useRetry_alias_1 }

declare const VIDEO_FORMATS: readonly ["mp4", "webm"];
export { VIDEO_FORMATS }
export { VIDEO_FORMATS as VIDEO_FORMATS_alias_1 }

declare class VideoEncoder_2 implements Disposable {
    private readonly _ctx;
    private readonly _sws;
    private readonly _src;
    private readonly _dst;
    private readonly _pkt;
    private readonly _stream;
    pts: bigint;
    private constructor();
    static create(opts: VideoEncoderOptions): Promise<VideoEncoder_2>;
    get stream(): Stream;
    get timeBase(): Rational;
    encode(bgra: Buffer, muxer: FormatMuxer): Promise<void>;
    flush(muxer: FormatMuxer): Promise<void>;
    [Symbol.dispose](): void;
    private drain;
}
export { VideoEncoder_2 as VideoEncoder }

export declare interface VideoEncoderOptions {
    width: number;
    height: number;
    fps: number;
    codecName: FFVideoEncoder;
    pixFmt: typeof AV_PIX_FMT_YUVA420P | typeof AV_PIX_FMT_YUV420P;
    codecTag?: string;
    globalHeader: boolean;
    codecOpts: Record<string, string>;
    bitrate: number;
    muxer: FormatMuxer;
}

declare interface VideoFiles {
    cover: string;
    mp4?: string;
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

export { }
