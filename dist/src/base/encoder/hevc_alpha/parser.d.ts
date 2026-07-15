export interface NvencHevcConfig {
    log2MaxPocLsb: number;
    numShortTermRefPicSets: number;
    numDeltaPocsSet0: number;
    longTermRefPicsPresent: boolean;
    spsTemporalMvpEnabled: boolean;
    saoEnabled: boolean;
    cabacInitPresent: boolean;
    ppsHasLoopFilterAcrossSlicesFlag: boolean;
}
export declare function parseNvencHevcConfig(extradata: Buffer): NvencHevcConfig;
