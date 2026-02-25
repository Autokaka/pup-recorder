// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/09.

export function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function periodical(
  callback: (count: number) => Promise<void> | void,
  ms: number,
) {
  let token: NodeJS.Timeout;
  let closed = false;
  async function tick(count: number) {
    await callback(count);
    if (closed) return;
    token = setTimeout(() => tick(count + 1), ms);
  }
  token = setTimeout(() => tick(0), ms);
  return () => {
    closed = true;
    clearTimeout(token);
  };
}
