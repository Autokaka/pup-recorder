// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/24.

export function noerr<Fn extends (...args: any[]) => any, D>(
  fn: Fn,
  defaultValue: D,
): (...args: Parameters<Fn>) => ReturnType<Fn> | D {
  return (...args) => {
    try {
      const ret = fn(...args);
      if (ret instanceof Promise) {
        return ret.catch(() => defaultValue);
      }
      return ret;
    } catch {
      return defaultValue;
    }
  };
}
