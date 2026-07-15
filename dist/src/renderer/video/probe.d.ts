export interface ProbeResult {
    width: number;
    height: number;
    duration: number;
    /** PTS (s) of the first decodable frame; a corrupt/empty leading run is held on it, like Chrome. */
    leadGap: number;
}
export declare function probe(src: string): Promise<ProbeResult>;
