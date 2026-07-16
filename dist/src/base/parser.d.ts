export declare function parseNumber(x: unknown): number;
export declare function parseString(x: unknown): string;
export declare function parseArray<T>(item: (x: unknown) => T): (x: unknown) => T[];
