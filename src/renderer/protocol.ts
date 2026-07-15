// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/01.

import type { Size } from "electron";
import { protocol } from "electron";
import { buildStegoHTML } from "./stego";

const PUP_SCHEME = "pup";
const FRAME_SCHEME = "pup-frame";

// registerSchemesAsPrivileged honors only the LAST call — register every custom scheme in this one list below.
const PRIVILEGED_PRIVILEGES = {
  standard: true,
  secure: true,
  bypassCSP: true,
  allowServiceWorkers: true,
  supportFetchAPI: true,
  corsEnabled: true,
  stream: true,
  codeCache: true,
} as const;

// Must be called synchronously before app is ready.
protocol.registerSchemesAsPrivileged([
  { scheme: PUP_SCHEME, privileges: PRIVILEGED_PRIVILEGES },
  { scheme: FRAME_SCHEME, privileges: PRIVILEGED_PRIVILEGES },
]);

// Must be called after app is ready.
export function setupPupProtocol(): void {
  protocol.handle(PUP_SCHEME, (req) => {
    const url = new URL(req.url);
    const src = url.searchParams.get("src") ?? "";
    const width = parseInt(url.searchParams.get("w") ?? "0", 10);
    const height = parseInt(url.searchParams.get("h") ?? "0", 10);
    const html = buildStegoHTML(src, { width, height });
    return new Response(html, { headers: { "content-type": "text/html" } });
  });
}

export function createStegoURL(src: string, size: Size): string {
  const url = new URL(`${PUP_SCHEME}://stego`);
  url.searchParams.set("src", src.replace("http://", "https://"));
  url.searchParams.set("w", String(size.width));
  url.searchParams.set("h", String(size.height));
  return url.toString();
}
