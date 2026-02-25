// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/25.

import electron, { type Size } from "electron";
import { exec } from "./process";

export const ELECTRON_OPTS = [
  "no-sandbox",
  "disable-setuid-sandbox",
  "disable-gpu",
  "disable-dev-shm-usage",
  "disable-software-rasterizer",
  "disable-web-security",
  "disable-site-isolation-trials",
  "disable-features=IsolateOrigins,site-per-process",
  "allow-insecure-localhost",
  "ignore-certificate-errors",
  "disable-blink-features=AutomationControlled",
  "mute-audio",
  "disable-extensions",
  "disable-background-networking",
  "address-family=ipv4",
  "disable-async-dns",
  "force-device-scale-factor=1",
  "trace-warnings",
  "force-color-profile=srgb",
  "disable-color-correct-rendering",
  "log-level=3",
];

export function runElectronApp(size: Size, app: unknown, args: unknown[]) {
  const electronArgs = ELECTRON_OPTS.map((a) => `--${a}`);
  const cmdParts = [];
  if (process.platform === "linux") {
    cmdParts.push(
      "xvfb-run",
      "--auto-servernum",
      `--server-args='-screen 0 ${size.width}x${size.height}x24'`,
    );
  }
  cmdParts.push(electron, ...electronArgs, app);
  return exec(cmdParts.join(" "), {
    stdio: ["ignore", "pipe", "pipe"],
    shell: true,
    env: {
      ...process.env,
      ELECTRON_DISABLE_DBUS: "1",
      RUST_BACKTRACE: "full",
      __PUP_ARGS__: JSON.stringify(args),
    },
  });
}
