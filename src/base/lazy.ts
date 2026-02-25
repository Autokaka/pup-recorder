// Created by Autokaka (qq1909698494@gmail.com) on 2026/01/30.

export class Lazy<T> {
  constructor(readonly makeValue: () => T) {}

  get value(): T {
    if (!this._initialized) {
      this._value = this.makeValue();
      this._initialized = true;
    }
    return this._value!;
  }

  get initialized(): boolean {
    return this._initialized;
  }

  private _initialized = false;
  private _value: T | undefined;
}
