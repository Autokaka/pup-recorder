import type { VideoMeta } from "./frame_server";
export declare class DecodeSession {
    readonly meta: VideoMeta;
    private readonly _src;
    private _buf;
    private _ready;
    private _want;
    private _done;
    private _closed;
    private _waiters;
    private readonly _leadFrames;
    private readonly _keepCount;
    private readonly _seekJump;
    private readonly _pump;
    private readonly _pumpDone;
    constructor(meta: VideoMeta, _src: string);
    getFrame(idx: number): Promise<Buffer>;
    close(): Promise<void>;
    private wait;
    private serve;
    private passEnded;
    private get demand();
    private evict;
    private drainWaiters;
}
