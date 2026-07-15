export declare class Lazy<T> {
    readonly makeValue: () => T;
    constructor(makeValue: () => T);
    get value(): T;
    get initialized(): boolean;
    private _initialized;
    private _value;
}
