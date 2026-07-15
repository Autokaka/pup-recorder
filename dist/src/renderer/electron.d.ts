export declare function electronOpts(disableGpu: boolean): Promise<string[]>;
export interface RunElectronAppOptions {
    args: unknown[];
}
export declare function runElectronApp({ args }: RunElectronAppOptions): Promise<import("../base/process").ProcessHandle>;
