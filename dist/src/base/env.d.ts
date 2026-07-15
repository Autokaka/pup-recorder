export type EnvParser<T> = (value: unknown) => T;
export declare function penv<T>(name: string, parser: EnvParser<T>, defaultValue: T): T;
export declare function penv<T>(name: string, parser: EnvParser<T>, defaultValue?: T): T | undefined;
