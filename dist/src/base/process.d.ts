import { type ChildProcess, type SpawnOptions } from "node:child_process";
export declare const PUP_ARGS_KEY = "--pup-priv-args";
export declare function pargs(): string[];
export interface ProcessHandle {
    process: ChildProcess;
    wait: Promise<void>;
    get killed(): boolean;
    kill(): void;
}
export declare function exec(cmd: string, options?: SpawnOptions): ProcessHandle;
