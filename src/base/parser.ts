// Created by Autokaka (qq1909698494@gmail.com) on 2026/01/30.

export function parseNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  const num = Number(value);
  if (Number.isNaN(num)) {
    throw new Error(`Value ${value} is not a valid number`);
  }
  return num;
}
