import type { VideoMeta } from "./frame_server";
export declare const DECODE_AHEAD = 4;
export interface PumpHost {
    readonly meta: VideoMeta;
    readonly src: string;
    closed(): boolean;
    aheadOfDemand(idx: number): boolean;
    serve(idx: number, buf: Buffer): void;
    passEnded(): void;
}
export declare class DecodePump {
    private readonly _host;
    private _gen;
    private _seekTo;
    private _passFrom;
    private _ctrl;
    private _resume;
    private _restart;
    private _done;
    constructor(_host: PumpHost);
    get pendingFrom(): number;
    get done(): Promise<void>;
    requestRestart(target?: number): void;
    abort(): void;
    wake(): void;
    private run;
    private decodePass;
    private pause;
    private untilRestart;
}
