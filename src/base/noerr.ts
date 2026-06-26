// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/24.

export function noerr<A extends unknown[], R, D>(fn: (...args: A) => R, defaultValue: D): (...args: A) => R | D {
  return (...args) => {
    try {
      const ret = fn(...args);
      if (ret instanceof Promise) {
        return ret.catch(() => defaultValue) as R | D;
      }
      return ret;
    } catch {
      return defaultValue;
    }
  };
}
