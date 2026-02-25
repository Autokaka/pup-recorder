// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/25.

export type EnvParser<T> = (value: unknown) => T;

export function penv<T>(name: string, parser: EnvParser<T>, defaultValue: T): T;
export function penv<T>(
  name: string,
  parser: EnvParser<T>,
  defaultValue?: T,
): T | undefined;
export function penv<T>(
  name: string,
  parser: EnvParser<T>,
  defaultValue?: T,
): T | undefined {
  try {
    return parser(process.env[name]);
  } catch {
    return defaultValue;
  }
}
