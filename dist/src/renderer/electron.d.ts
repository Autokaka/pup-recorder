export declare function electronOpts(args: unknown[]): Promise<string[]>;
export interface RunElectronAppOptions {
    args: unknown[];
}
export declare function runElectronApp({ args }: RunElectronAppOptions): Promise<import("../base/process").ProcessHandle>;
