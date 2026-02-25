# pup(1) -- High-performance webview recorder

## NAME

pup - record web pages as video

## SYNOPSIS

**pup** \<source\> [**-w** _width_] [**-h** _height_] [**-f** _fps_] [**-t** _duration_] [**-o** _dir_] [**-a**] [**--use-inner-proxy**]

## DESCRIPTION

**pup** captures a web page as video using Electron offscreen rendering.

Without **-a**, produces MP4 (H.264). With **-a**, produces WebM (VP9) and
MOV (HEVC with alpha channel). A cover image (PNG) is extracted from the
first frame.

## OPTIONS

- **\<source\>**
  URL or HTML string to record.

- **-w**, **--width** _number_
  Video width. Default: 1920.

- **-h**, **--height** _number_
  Video height. Default: 1080.

- **-f**, **--fps** _number_
  Frames per second. Default: 30.

- **-t**, **--duration** _number_
  Recording duration in seconds. Default: 5.

- **-o**, **--out-dir** _path_
  Output directory. Default: out.

- **-a**, **--with-alpha-channel**
  Produce WebM + MOV with alpha channel instead of MP4.

- **--use-inner-proxy**
  Use Bilibili internal proxy. Default: `$PUP_USE_INNER_PROXY`.

## ENVIRONMENT

- `PUP_LOG_LEVEL` (default: 2)
  0=error, 1=warn, 2=info, 3=debug.

- `PUP_USE_INNER_PROXY` (default: 0)
  Set to 1 to enable Bilibili internal proxy.

- `FFMPEG_BIN` (default: ffmpeg)
  Path to FFmpeg binary.

## API

```typescript
import { pup, type PupOptions } from "pup-recorder";

const result = await pup("https://example.com", {
  width: 1920,
  height: 1080,
  fps: 30,
  duration: 5,
  outDir: "out",
  withAlphaChannel: false,
  onProgress: (progress) => console.log(progress),
});
```

**PupOptions**: `width`, `height`, `fps`, `duration`, `outDir`,
`withAlphaChannel`, `cancelQuery`, `onProgress`.

**Returns**: `{ mp4?, webm?, mov?, cover, width, height, fps, duration }`.

## FILES

    bin/pup.js            CLI entry point
    dist/index.js         Library entry point
    rust/*.node           Precompiled native binaries
    x265/*                Precompiled x265 binaries

## EXAMPLES

    pup https://example.com -w 1280 -h 720 -t 5
    pup "file:///path/to/page.html" -a
    pup https://example.com -f 60 -o ./output

## SEE ALSO

**pup-server**(1), **pup**(7)

## AUTHOR

qq1909698494@gmail.com
