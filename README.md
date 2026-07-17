![pup-recorder](assets/logo.png)

Render a web page to video. Loads a URL, local file, or `data:` document in headless Electron and captures it to `.mp4` / `.webm`, with hardware HEVC-alpha encoding, optional audio, and a deterministic mode for reproducible output.

## Features

- Headless offscreen rendering — no display server.
- Two modes: real-time recording, or deterministic frame-by-frame (same input, same bytes).
- Hardware HEVC-alpha encode via NVENC or VideoToolbox, software fallback.
- Alpha preserved end to end.
- Optional audio, AAC.

## Install

```sh
bun add pup-recorder
```

Bundles Electron and a prebuilt `node-av` (FFmpeg) — no system FFmpeg or Chrome.

Runs on macOS, Linux, and Windows (x64 + arm64). Hardware encode uses VideoToolbox on macOS and NVENC on Linux/Windows with an NVIDIA GPU; a software encoder covers everything else.

## API

```ts
import { pup } from "pup-recorder";

const result = await pup("https://example.com", {
  fps: 30,
  duration: 10,
  deterministic: true,
  outFiles: ["out/demo.mp4", "out/demo.webm"],
  onProgress: (pct) => console.log(pct),
  signal: AbortSignal.timeout(120_000),
});

result.outFiles;    // video paths
result.written;     // frames encoded
result.blank;       // blank-frame ratio
result.jank;        // frame-drop score
result.screenshots; // PNG paths
```

All options default; pass only overrides. `signal` cancels a run; `onProgress` streams 0–100.

## CLI

```sh
pup https://example.com -o out/demo.mp4            # real-time
pup https://example.com -t 10 -d -o out/demo.mp4   # deterministic, 10s
```

`<source>` is an `http(s)://`, `file://`, `data:` URI, or path. Outputs are comma-separated; the extension picks the encoder (`.mp4` → HEVC+AAC, `.webm` → VP9). Key flags: `-W`/`-H` size, `-f` fps, `-t` duration, `-d` deterministic, `-a` audio, `-S` screenshot marks. Full list: `pup --help`.

## How it works

pup-recorder runs as two processes: a parent owning the CLI/API and lifecycle, and an Electron subprocess doing offscreen render + encode, over IPC.

Electron loads the page into a headless offscreen `BrowserWindow`; each frame arrives as a BGRA bitmap and feeds the encoder: BGRA → HEVC-with-alpha (NVENC / VideoToolbox, or software x265) → `.mp4`; VP9 for `.webm`.

The two modes differ in *when* a frame is captured.

**Real-time (default).** The page runs on the real clock; `paint` events are muxed at wall-clock speed. For content whose timing you don't control (`<video>`, live WebGL). Drops frames if the machine can't keep up.

**Deterministic (`-d`).** Fakes time and advances it one frame at a time. Hooks `requestAnimationFrame`, `setTimeout`/`setInterval`, `Date`, `performance.now`, `getAnimations`, and steps the compositor clock by `1/fps` (`advanceVirtualTime`). Frame N is computed at exactly `N/fps` regardless of CPU time — reproducible, no dropped frames, cache-keyable by input hash.

**Frame sync.** A 1-pixel row at the bottom of each frame encodes the intended timestamp; the capturer decodes it off the bitmap and rejects any frame that doesn't match, defeating compositor coalescing and off-by-one capture.

## Production

pup-recorder is the core rendering engine of [花生AI](https://www.huasheng.cn/), driving ~1.7M video exports a day at five-nines (99.999%) reliability. Its direction is driven solely by production needs [at bilibili](https://jobs.bilibili.com/), reasoned from first principles — not by backward compatibility. Expect breaking changes; pin a version.

## License

MIT © 2026 Autokaka
