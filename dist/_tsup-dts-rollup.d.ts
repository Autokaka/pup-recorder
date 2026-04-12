import { AV_SAMPLE_FMT_FLT } from 'node-av/constants';
import { AV_SAMPLE_FMT_FLTP } from 'node-av/constants';
import { AVPixelFormat } from 'node-av/constants';
import { BrowserWindow } from 'electron';
import { ChildProcess } from 'child_process';
import { CodecContext } from 'node-av';
import type { Debugger } from 'electron';
import { EventEmitter } from 'events';
import { FFAudioEncoder } from 'node-av/constants';
import { FFVideoEncoder } from 'node-av/constants';
import { FormatContext } from 'node-av';
import { Frame } from 'node-av';
import { HardwareContext } from 'node-av/api';
import type { NativeImage } from 'electron';
import { Packet } from 'node-av';
import { Size } from 'electron';
import { Socket } from 'net';
import { SoftwareScaleContext } from 'node-av';
import { SpawnOptions } from 'child_process';
import { Stream } from 'node-av';
import z from 'zod';

export declare function advanceVirtualTime(cdp: Debugger, budget: number): Promise<void>;

export declare const ANNEX_B_START_CODE: Buffer<ArrayBuffer>;

export declare interface AudioCapture {
    teardown(): Promise<void>;
}

export declare interface AudioCaptureOptions {
    encoder: EncoderPipeline;
    getVideoTimeMs: () => number;
    onError: (error: Error) => void;
}

declare class AudioEncoder_2 implements Disposable {
    private _ctx;
    private _stream;
    private _pkt;
    private _outRate;
    private _outFmt;
    private _frameSize;
    private _filterFrame;
    private _graph?;
    private _bufSrc?;
    private _bufSink?;
    private _inRate?;
    private _pts;
    private constructor();
    static create(opts: AudioEncoderOptions): Promise<AudioEncoder_2>;
    setInputRate(inSampleRate: number): void;
    encode(pcm: Buffer, muxer: FormatMuxer): Promise<void>;
    flush(muxer: FormatMuxer): Promise<void>;
    [Symbol.dispose](): void;
    private drain;
    private drainCodec;
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

/**
 * Build alpha_channel_info SEI message (payloadType=165).
 * Layout from x265 SEIAlphaChannelInfo::writeSEI.
 */
export declare function buildAlphaChannelInfoSEI(): Buffer;

export declare function buildRust(): Promise<void>;

export declare function buildStegoHTML(targetURL: string, size: Size): string;

/**
 * Builds the JS injector that hooks all time-related globals in the target frame.
 * In Electron/stego mode (default), guards against running in the top-level frame.
 * In Puppeteer mode (skipFrameGuard: true), injects directly into the main document.
 * Must be injected via Page.addScriptToEvaluateOnNewDocument AND directly into
 * already-loaded frames.
 */
export declare function buildTickInjector(opts?: TickInjectorOptions): string;

/**
 * Build unified extradata: base VPS (patched for alpha) + interleaved SPS/PPS.
 * Alpha SPS/PPS follow their base counterparts so the HVCC serializer
 * groups them into the same NAL array (required for multi-layer).
 */
export declare function buildUnifiedExtradata(baseExtradata: Buffer, alphaExtradata: Buffer): Buffer;

export declare const canIUseGPU: Promise<boolean>;

export declare function checkHTML(source: string): void;

export declare function chromiumOptions(disableGpu: boolean): Promise<string[]>;

export declare interface CLIOptions {
    name: string;
    defaults: RenderOptions;
    run: (source: string, options: RenderOptions) => Promise<unknown>;
}

declare class CodecState_2 implements Disposable {
    readonly src: Frame;
    readonly dst: Frame;
    readonly pkt: Packet;
    private _sws?;
    private _png?;
    static create(width: number, height: number): Promise<CodecState_2>;
    private constructor();
    /**
     * Create a fresh PNG decoder context.
     * The FFmpeg PNG decoder accumulates APNG blending state
     * across frames, so a shared instance corrupts output when decoding standalone PNGs.
     */
    png(): Promise<CodecContext>;
    decodePNG(pngData: Buffer): Promise<Frame>;
    get sws(): SoftwareScaleContext;
    [Symbol.dispose](): void;
}
export { CodecState_2 as CodecState }

declare class ConcurrencyLimiter {
    readonly maxConcurrency: number;
    private _active;
    private _queue;
    private _signals;
    private _resolve?;
    constructor(maxConcurrency: number);
    get active(): number;
    get pending(): number;
    get stats(): string;
    schedule<T>(fn: () => Promise<T>, signal?: AbortSignal): Promise<T>;
    drain(): Promise<void>;
    private flush;
    private next;
}
export { ConcurrencyLimiter }
export { ConcurrencyLimiter as ConcurrencyLimiter_alias_1 }

export declare function connectIpc(socketPath: string): Promise<IpcWriter>;

export declare function createIpcServer(socketPath: string): Promise<IpcServer>;

export declare function createStegoURL(src: string, size: Size): string;

export declare function createVideoEncoder(opts: VideoFactoryOptions, muxer: FormatMuxer): Promise<VideoSetup>;

export declare function debounce<T extends (...args: unknown[]) => void>(fn: T, delay?: number): T;

export declare function decodeStego(bitmap: Buffer, size: Size): number | undefined;

declare const DEFAULT_DURATION = 5;
export { DEFAULT_DURATION }
export { DEFAULT_DURATION as DEFAULT_DURATION_alias_1 }

declare const DEFAULT_FPS = 30;
export { DEFAULT_FPS }
export { DEFAULT_FPS as DEFAULT_FPS_alias_1 }

declare const DEFAULT_HEIGHT = 1080;
export { DEFAULT_HEIGHT }
export { DEFAULT_HEIGHT as DEFAULT_HEIGHT_alias_1 }

declare const DEFAULT_OUT_FILE = "output.mp4";
export { DEFAULT_OUT_FILE }
export { DEFAULT_OUT_FILE as DEFAULT_OUT_FILE_alias_1 }

declare const DEFAULT_WIDTH = 1920;
export { DEFAULT_WIDTH }
export { DEFAULT_WIDTH as DEFAULT_WIDTH_alias_1 }

declare const defaultRenderOptions: RenderOptions;
export { defaultRenderOptions }
export { defaultRenderOptions as defaultRenderOptions_alias_1 }

export declare function doEject(): string;

export declare function doProcess(timestampMs: number): string;

export declare function doPuppeteer(source: string, options: RenderOptions, onProgress?: (p: number) => void): Promise<IpcDonePayload>;

export declare function drainPackets(ctx: CodecContext, pkt: Packet, stream: Stream, muxer: FormatMuxer): Promise<void>;

export declare function electronOpts(disableGpu: boolean): Promise<string[]>;

export declare function encodeNalHeader(type: number, layerId: number, temporalId: number): [number, number];

declare class EncoderPipeline {
    private _s;
    private _disposed;
    private constructor();
    static create(opts: EncoderPipelineOptions): Promise<EncoderPipeline>;
    setupAudio(sampleRate: number): void;
    encodeBGRA(input: Buffer): Promise<void>;
    encodePNG(pngData: Buffer): Promise<void>;
    encodeAudio(pcm: Buffer): Promise<void>;
    finish(): Promise<string>;
    [Symbol.asyncDispose](): Promise<void>;
    private free;
    private bgraFrame;
}
export { EncoderPipeline }
export { EncoderPipeline as EncoderPipeline_alias_1 }

declare interface EncoderPipelineOptions {
    width: number;
    height: number;
    fps: number;
    outFile: string;
    withAudio?: boolean;
    disableGpu?: boolean;
}
export { EncoderPipelineOptions }
export { EncoderPipelineOptions as EncoderPipelineOptions_alias_1 }

declare type EnvParser<T> = (value: unknown) => T;
export { EnvParser }
export { EnvParser as EnvParser_alias_1 }

declare function exec(cmd: string, options?: SpawnOptions): ProcessHandle;
export { exec }
export { exec as exec_alias_1 }

export declare interface FixedBufferWriter {
    new (path: string, bufferSize: number, queueDepth?: number): FixedBufferWriter;
    write(buffer: Buffer): void;
    close(): Promise<void>;
}

export declare const FixedBufferWriter: FixedBufferWriter;

declare class FormatMuxer {
    private readonly _ctx;
    private _opened;
    constructor(outPath: string, formatName?: string);
    addStream(codecCtx: CodecContext, codecTag?: string): ReturnType<FormatContext["newStream"]>;
    open(): Promise<void>;
    writePacket(pkt: Packet): Promise<void>;
    [Symbol.asyncDispose](): Promise<void>;
}
export { FormatMuxer }
export { FormatMuxer as FormatMuxer_alias_1 }

export declare const FRAME_SYNC_MARKER_HEIGHT = 1;

export declare const FRAME_SYNC_MARKER_WIDTH = 32;

/**
 * Frame drop quality score (0 = perfect, 1 = worst).
 *
 * Combines two dimensions:
 * - Global: overall drop rate across the timeline
 * - Local: perceptual severity of consecutive drops (bursts)
 *
 * Uses complementary multiplication: score = 1 - (1-g)(1-l)
 */
export declare interface FrameDropScore {
    global: number;
    local: number;
    jank: number;
    expected: number;
    actual: number;
    maxBurst: number;
}

export declare class FrameDropStats {
    private readonly _fps;
    private _actual;
    private _currentBurst;
    private _bursts;
    constructor(fps: number);
    /** Call when a frame is actually written to the encoder. */
    wrote(count?: number): void;
    /** Call when a frame is dropped. */
    dropped(count?: number): void;
    /** Finalize and return the score. */
    finalize(): FrameDropScore;
}

export declare type HwEncoder = VideoToolboxEncoder | NvencDualLayerEncoder;

export declare interface HwVideoEncoderOptions {
    width: number;
    height: number;
    fps: number;
    hw: HardwareContext;
    bitrate: number;
    muxer: FormatMuxer;
}

/** Interleave base and alpha NALs for a single frame. */
export declare function interleaveAccessUnits(baseNals: NalUnit[], alphaNals: NalUnit[]): Buffer;

export declare interface IpcDonePayload {
    written: number;
    jank: number;
    outFile: string;
}

export declare const enum IpcMsgType {
    PROGRESS = 1,
    DONE = 2,
    ERROR = 3
}

export declare class IpcReader extends EventEmitter<{
    progress: [value: number];
    message: [type: IpcMsgType, buffer: Buffer];
    done: [payload: IpcDonePayload];
    error: [error: Error];
    close: [];
}> {
    private readonly _socket;
    private _chunks;
    private _buffered;
    constructor(_socket: Socket);
    private onData;
    private flush;
    private peek;
    private consume;
}

export declare interface IpcServer {
    waitForConnection(): Promise<IpcReader>;
    close(): void;
}

export declare class IpcWriter {
    private readonly _socket;
    constructor(_socket: Socket);
    writeProgress(value: number): void;
    writeError(error: string): void;
    writeDone(payload: IpcDonePayload): void;
    private write;
}

export declare function isEmpty(image: NativeImage): boolean;

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

export declare function loadWindow({ source, onCreated, renderer }: WindowOptions): Promise<BrowserWindow>;

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

export declare function makeCLI(options: CLIOptions): Promise<void>;

export declare function makeFrame(width: number, height: number, pixFmt: AVPixelFormat): Frame;

export declare function makePacket(): Packet;

export declare const NAL_HEADER_SIZE = 2;

export declare interface NalUnit {
    type: number;
    layerId: number;
    data: Buffer;
}

export declare interface NetworkOptions {
    source: string;
    window: BrowserWindow;
    useInnerProxy?: boolean;
}

declare function noerr<Fn extends (...args: any[]) => any, D>(fn: Fn, defaultValue: D): (...args: Parameters<Fn>) => ReturnType<Fn> | D;
export { noerr }
export { noerr as noerr_alias_1 }

export declare class NvencDualLayerEncoder implements Disposable {
    private _s;
    private _seiBuffer;
    private _pts;
    private _seiInjected;
    private _alphaBuf?;
    private _alphaFrame?;
    private constructor();
    static create(opts: HwVideoEncoderOptions): Promise<NvencDualLayerEncoder>;
    encode(bgraFrame: Frame, muxer: FormatMuxer): Promise<void>;
    flush(muxer: FormatMuxer): Promise<void>;
    [Symbol.dispose](): void;
    private drainInterleaved;
}

export declare function packBits(bits: number[]): Buffer;

declare function pargs(): string[];
export { pargs }
export { pargs as pargs_alias_1 }

declare function parseNumber(x: unknown): number;
export { parseNumber }
export { parseNumber as parseNumber_alias_1 }

declare function parseString(x: unknown): string;
export { parseString }
export { parseString as parseString_alias_1 }

export declare function pauseVirtualTime(cdp: Debugger): Promise<void>;

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

declare function pup(source: string, options: Partial<PupOptions>): Promise<PupResult>;
export { pup }
export { pup as pup_alias_1 }

declare const PUP_ARGS_KEY = "--pup-priv-args";
export { PUP_ARGS_KEY }
export { PUP_ARGS_KEY as PUP_ARGS_KEY_alias_1 }

declare const pupApp: string;
export { pupApp }
export { pupApp as pupApp_alias_1 }

declare const pupDeterministic: boolean;
export { pupDeterministic }
export { pupDeterministic as pupDeterministic_alias_1 }

declare const pupDisableGPU: boolean;
export { pupDisableGPU }
export { pupDisableGPU as pupDisableGPU_alias_1 }

declare const pupExperimentalPuppeteer: boolean;
export { pupExperimentalPuppeteer }
export { pupExperimentalPuppeteer as pupExperimentalPuppeteer_alias_1 }

declare const pupIpcSocket: string | undefined;
export { pupIpcSocket }
export { pupIpcSocket as pupIpcSocket_alias_1 }

declare const pupLogLevel: number;
export { pupLogLevel }
export { pupLogLevel as pupLogLevel_alias_1 }

declare interface PupOptions extends Partial<RenderOptions> {
    signal?: AbortSignal;
    onProgress?: PupProgressCallback;
}
export { PupOptions }
export { PupOptions as PupOptions_alias_1 }

declare const pupPkgRoot: string;
export { pupPkgRoot }
export { pupPkgRoot as pupPkgRoot_alias_1 }

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

export declare function render(writer: IpcWriter, source: string, options: RenderOptions): Promise<IpcDonePayload>;

declare type RenderOptions = z.infer<typeof RenderSchema>;
export { RenderOptions }
export { RenderOptions as RenderOptions_alias_1 }

declare interface RenderResult {
    options: RenderOptions;
    written: number;
    jank: number;
    outFile: string;
}
export { RenderResult }
export { RenderResult as RenderResult_alias_1 }

declare const RenderSchema: z.ZodObject<{
    duration: z.ZodNumber;
    width: z.ZodNumber;
    height: z.ZodNumber;
    fps: z.ZodNumber;
    withAudio: z.ZodBoolean;
    outFile: z.ZodString;
    useInnerProxy: z.ZodBoolean;
    deterministic: z.ZodBoolean;
    disableGpu: z.ZodBoolean;
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

/** Rewrite nuh_layer_id in a NAL unit (returns copy). */
export declare function rewriteNalLayerId(nal: Buffer, layerId: number): Buffer;

export declare function runElectronApp(size: Size, args: unknown[], ipcSocketPath: string): Promise<ProcessHandle>;

export declare function setInterceptor({ source, window, useInnerProxy }: NetworkOptions): void;

export declare function setupAudioCapture({ encoder, getVideoTimeMs, onError, }: AudioCaptureOptions): Promise<AudioCapture>;

export declare function setupPupProtocol(): void;

export declare function shoot(writer: IpcWriter, source: string, options: RenderOptions): Promise<IpcDonePayload>;

declare function sleep(ms: number): Promise<void>;
export { sleep }
export { sleep as sleep_alias_1 }

/** Split Annex B bitstream into NAL units. */
export declare function splitNalUnits(bitstream: Buffer): NalUnit[];

export declare function startStego(cdp: Debugger): Promise<any>;

export declare function stopStego(cdp: Debugger): Promise<any>;

export declare const TICK_SYMBOL = "__pup_tick__";

export declare interface TickInjectorOptions {
    /**
     * When true, skips the top-frame guard so the injector runs in the main document.
     * Required for Puppeteer mode where the page is loaded directly (no stego iframe wrapper).
     * Default: false (Electron/stego mode — only inject in iframes).
     */
    skipFrameGuard?: boolean;
}

export declare function unsetInterceptor(window: BrowserWindow): void;

declare function useRetry<Args extends any[], Ret>({ fn, maxAttempts, timeout }: RetryOptions<Args, Ret>): (...args: Args) => Promise<Ret>;
export { useRetry }
export { useRetry as useRetry_alias_1 }

declare class VideoEncoder_2 implements Disposable {
    private readonly _ctx;
    private readonly _pkt;
    private readonly _stream;
    private _pts;
    private constructor();
    static create(opts: VideoEncoderOptions): Promise<VideoEncoder_2>;
    encode(frame: Frame, muxer: FormatMuxer): Promise<void>;
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
    codecTag?: string;
    globalHeader: boolean;
    codecOpts: Record<string, string>;
    bitrate: number;
    pixelFormat: AVPixelFormat;
    muxer: FormatMuxer;
}

export declare interface VideoFactoryOptions {
    width: number;
    height: number;
    fps: number;
    bitrate?: number;
    disableGpu?: boolean;
}

export declare interface VideoSetup {
    video?: VideoEncoder_2;
    hwVideo?: HwEncoder;
    codec?: CodecState_2;
    hw?: HardwareContext;
}

export declare class VideoToolboxEncoder implements Disposable {
    private _ctx;
    private _pkt;
    private _stream;
    private _pts;
    private constructor();
    static create(opts: HwVideoEncoderOptions): Promise<VideoToolboxEncoder>;
    encode(bgraFrame: Frame, muxer: FormatMuxer): Promise<void>;
    flush(muxer: FormatMuxer): Promise<void>;
    [Symbol.dispose](): void;
    private drain;
}

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

export declare interface WindowOptions {
    source: string;
    onCreated?: (window: BrowserWindow) => Promise<void>;
    renderer: RenderOptions;
    warmup?: boolean;
}

export { }
