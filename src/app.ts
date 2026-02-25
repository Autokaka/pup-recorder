// Created by Autokaka (qq1909698494@gmail.com) on 2026/01/30.

import { app } from "electron";
import { ELECTRON_OPTS } from "./base/electron";
import { record, type RecordOptions } from "./base/record";
import { makeCLI } from "./common";

process.once("exit", () => app.quit());

makeCLI("app", async (source: string, options: RecordOptions) => {
  try {
    ELECTRON_OPTS.forEach((o) => app.commandLine.appendSwitch(o));
    app.dock?.hide();
    await app.whenReady();
    await record(source, options);
  } finally {
    app.quit();
  }
});
