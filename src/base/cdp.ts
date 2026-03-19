// Created by Autokaka (qq1909698494@gmail.com) on 2026/03/13.

import type { Debugger } from "electron";

export function advanceVirtualTime(cdp: Debugger, budget: number): Promise<void> {
  return new Promise((resolve) => {
    const handler = (_: Electron.Event, method: string) => {
      if (method === "Emulation.virtualTimeBudgetExpired") {
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
