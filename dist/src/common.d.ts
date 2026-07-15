import { type RenderOptions } from "./renderer/schema";
export interface CLIOptions {
    name: string;
    run: (source: string, options: RenderOptions) => Promise<unknown>;
}
export declare function makeCLI(options: CLIOptions): Promise<void>;
