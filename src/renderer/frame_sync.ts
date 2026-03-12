// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/09.

import type { Debugger, Size } from "electron";

export const FRAME_SYNC_MARKER_WIDTH = 32;
export const FRAME_SYNC_MARKER_HEIGHT = 1;

export function buildWrapperHTML(targetURL: string, size: Size): string {
  const { width, height } = size;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: ${width}px; height: ${height + 1}px; overflow: hidden; }
    #target { 
      position: absolute; 
      top: 0; 
      left: 0; 
      width: ${width}px; 
      height: ${height}px; 
      border: none; 
      display: block;
    }
    #stego { 
      position: absolute; 
      top: ${height}px; 
      left: 0; 
      width: ${width}px; 
      height: 1px; 
      display: block;
      image-rendering: pixelated;
    }
  </style>
</head>
<body>
  <iframe id="target" src="${targetURL}"></iframe>
  <canvas id="stego" width="${width}" height="1"></canvas>
  <script>
    (function() {
      const WIDTH = ${width};
      const MARKER_WIDTH = ${FRAME_SYNC_MARKER_WIDTH};
      const canvas = document.getElementById('stego');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      let startTime = null;
      let rafId = null;

      function encodeTimestamp(timestampMs) {
        const imageData = ctx.createImageData(WIDTH, 1);
        const data = imageData.data;
        
        const timestampInt = Math.floor(timestampMs) >>> 0;
        
        for (let i = 0; i < MARKER_WIDTH; i++) {
          const bit = (timestampInt >>> (MARKER_WIDTH - 1 - i)) & 1;
          const value = bit ? 255 : 0;
          const idx = i * 4;
          data[idx] = value;
          data[idx + 1] = value;
          data[idx + 2] = value;
          data[idx + 3] = 255;
        }
        
        for (let i = MARKER_WIDTH; i < WIDTH; i++) {
          const idx = i * 4;
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
          data[idx + 3] = 255;
        }
        
        ctx.putImageData(imageData, 0, 0);
      }

      function updateLoop() {
        if (startTime === null) return;
        const elapsed = performance.now() - startTime;
        encodeTimestamp(elapsed);
        rafId = requestAnimationFrame(updateLoop);
      }

      window.__pup_start_recording__ = () => {
        startTime = performance.now();
        encodeTimestamp(0);
        requestAnimationFrame(updateLoop);
      };

      window.__pup_stop_recording__ = () => {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      };
    })();
  </script>
</body>
</html>`;
}

export function decodeTimestamp(
  bitmap: Buffer,
  size: Size,
): number | undefined {
  const { width, height } = size;
  if (width < FRAME_SYNC_MARKER_WIDTH || height < 2) {
    return undefined;
  }

  const markerRow = height - 1;

  let timestamp = 0;
  for (let i = 0; i < FRAME_SYNC_MARKER_WIDTH; i++) {
    const pixelIdx = (markerRow * width + i) * 4;
    const r = bitmap[pixelIdx] ?? 0;
    const bit = r > 127 ? 1 : 0;
    timestamp = (timestamp << 1) | bit;
  }

  timestamp = timestamp >>> 0;

  if (!Number.isFinite(timestamp) || timestamp < 0 || timestamp > 1e7) {
    return undefined;
  }

  return timestamp;
}

export function startSync(cdp: Debugger) {
  return cdp.sendCommand("Runtime.evaluate", {
    expression: `window.__pup_start_recording__()`,
  });
}

export function stopSync(cdp: Debugger) {
  return cdp.sendCommand("Runtime.evaluate", {
    expression: `window.__pup_stop_recording__()`,
  });
}
