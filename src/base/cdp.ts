// Created by Autokaka (qq1909698494@gmail.com) on 2026/03/13.

import type { Debugger, Size } from "electron";
import { withTimeout } from "./timing";

const CDP_TIMEOUT_MS = 5_000;

export function send(cdp: Debugger, method: string, params?: object): Promise<unknown> {
  return withTimeout(cdp.sendCommand(method, params), CDP_TIMEOUT_MS, `cdp.${method}`);
}

export function evalIn(cdp: Debugger, expression: string): Promise<unknown> {
  return withTimeout(send(cdp, "Runtime.evaluate", { expression }), CDP_TIMEOUT_MS, "evalIn");
}

export function advanceVirtualTime(cdp: Debugger, budget: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cdp.off("message", handler);
      reject(new Error(`advanceVirtualTime timed out after ${CDP_TIMEOUT_MS}ms`));
    }, CDP_TIMEOUT_MS);

    const handler = (_: Electron.Event, method: string) => {
      if (method === "Emulation.virtualTimeBudgetExpired") {
        clearTimeout(timeout);
        cdp.off("message", handler);
        resolve();
      }
    };
    cdp.on("message", handler);
    send(cdp, "Emulation.setVirtualTimePolicy", { policy: "advance", budget }).catch((e) => {
      clearTimeout(timeout);
      cdp.off("message", handler);
      reject(e);
    });
  });
}

export async function pauseVirtualTime(cdp: Debugger): Promise<void> {
  await send(cdp, "Emulation.setVirtualTimePolicy", { policy: "pause" });
}

export async function resizeDrawable(cdp: Debugger, size: Size) {
  await send(cdp, "Emulation.setDeviceMetricsOverride", {
    ...size,
    deviceScaleFactor: 1,
    mobile: false,
  });
}
