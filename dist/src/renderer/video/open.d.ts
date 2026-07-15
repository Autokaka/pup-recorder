import { Demuxer } from "node-av/api";
export declare function openInput(src: string, signal?: AbortSignal): Promise<Demuxer>;
