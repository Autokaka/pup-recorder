// Created by Autokaka (qq1909698494@gmail.com) on 2026/03/13.

import type { Debugger } from "electron";

const ADVANCE_TIMEOUT_MS = 30_000;

export function advanceVirtualTime(cdp: Debugger, budget: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cdp.off("message", handler);
      reject(new Error(`advanceVirtualTime timed out after ${ADVANCE_TIMEOUT_MS}ms`));
    }, ADVANCE_TIMEOUT_MS);

    const handler = (_: Electron.Event, method: string) => {
      if (method === "Emulation.virtualTimeBudgetExpired") {
        clearTimeout(timeout);
        cdp.off("message", handler);
        resolve();
      }
    };
    cdp.on("message", handler);
    cdp.sendCommand("Emulation.setVirtualTimePolicy", {
      policy: "advance",
      budget,
    });
  });
}

export function pauseVirtualTime(cdp: Debugger): Promise<void> {
  return cdp.sendCommand("Emulation.setVirtualTimePolicy", { policy: "pause" });
}
