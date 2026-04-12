// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/10.

export function debounce<T extends (...args: unknown[]) => void>(fn: T, delay = 100): T {
  let timer: NodeJS.Timeout | undefined;
  return function (this: unknown, ...args: Parameters<T>) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = undefined;
    }, delay);
  } as T;
}
