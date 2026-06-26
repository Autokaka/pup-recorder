// Created by Autokaka (qq1909698494@gmail.com) on 2026/05/18.

import { protocol } from "electron";
import { logger } from "../../base/logging";
import { frameServer, type VideoMeta } from "./frame_server";

const TAG = "[FrameProtocol]";

// Scheme is registered alongside `pup` in renderer/protocol.ts (single call only).
const SCHEME = "pup-frame";

const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "*",
};

// Must be called after app is ready.
export function setupFrameProtocol(): void {
  protocol.handle(SCHEME, async (req) => {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    const url = new URL(req.url);
    logger.debug(TAG, `${req.method} ${url.hostname}${url.search}`);
    try {
      switch (url.hostname) {
        case "open":
          return jsonOk(
            await frameServer.open({
              src: url.searchParams.get("src") ?? "",
              fps: int(url, "fps", 30),
              dstW: int(url, "w", 0),
              dstH: int(url, "h", 0),
              fit: url.searchParams.get("fit") ?? undefined,
            }),
          );
        case "frame":
          return rgbaOk(await frameServer.getFrame(url.searchParams.get("id") ?? "", int(url, "idx", 1)));
        case "close":
          frameServer.close(url.searchParams.get("id") ?? "");
          return new Response(null, { status: 204, headers: CORS_HEADERS });
        default:
          return new Response(`unknown action: ${url.hostname}`, { status: 404, headers: CORS_HEADERS });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return new Response(msg, { status: 500, headers: CORS_HEADERS });
    }
  });
}

function jsonOk(meta: VideoMeta): Response {
  return new Response(JSON.stringify(meta), {
    headers: { ...CORS_HEADERS, "content-type": "application/json" },
  });
}

// Raw RGBA pixels; the page wraps them in ImageData using meta.width/height it got from `open`.
function rgbaOk(bytes: Buffer): Response {
  if (bytes.byteLength === 0) {
    return new Response(null, { status: 410, headers: CORS_HEADERS });
  }
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Response(copy.buffer as ArrayBuffer, {
    headers: { ...CORS_HEADERS, "content-type": "application/octet-stream", "cache-control": "no-store" },
  });
}

function int(url: URL, key: string, fallback: number): number {
  const v = url.searchParams.get(key);
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : fallback;
}
