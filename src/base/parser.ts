// Created by Autokaka (qq1909698494@gmail.com) on 2026/01/30.

export function parseNumber(x: unknown): number {
  if (typeof x === "number") {
    return x;
  }
  const num = Number(x);
  if (Number.isNaN(num)) {
    throw new Error(`Value ${x} is not a valid number`);
  }
  return num;
}

export function parseString(x: unknown): string {
  if (typeof x === "string") return x;
  return String(x);
}
