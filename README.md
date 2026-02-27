# pup(1)

## NAME

pup - record web pages as video

## SYNOPSIS

```
pup <source> [-w width] [-h height] [-f fps] [-t duration] [-o dir] [-a]
```

## DESCRIPTION

Captures web pages as video using Electron offscreen rendering. Outputs MP4
by default; with `-a` outputs WebM (VP9) and MOV (HEVC alpha).

## OPTIONS

```
<source>                file://, http(s)://, or data: URI
-w, --width <n>         default 1920
-h, --height <n>        default 1080
-f, --fps <n>           default 30
-t, --duration <n>      seconds, default 5
-o, --out-dir <path>    default "out"
-a, --with-alpha-channel
--use-inner-proxy       bilibili internal proxy
```

## ENVIRONMENT

```
PUP_LOG_LEVEL        0=error 1=warn 2=info 3=debug, default 2
PUP_USE_INNER_PROXY  1=on, default 0
FFMPEG_BIN           default "ffmpeg"
```

## API

```typescript
import { pup } from "pup-recorder";

const { mp4, cover, width, height, fps, duration } = await pup(
  "https://example.com",
  {
    width: 1920,
    height: 1080,
    fps: 30,
    duration: 5,
    withAlphaChannel: false,
  },
);
```

Returns `{ mp4?, webm?, mov?, cover, width, height, fps, duration }`.

## FILES

```
dist/cli.js           CLI
dist/index.js         library
rust/*.node           native module
x265/*                x265 binaries
```

## EXAMPLES

```
pup https://example.com -t 5
pup file:///path/to/page.html -a
pup https://example.com -w 1280 -h 720 -f 60
```

## SEE ALSO

pup-recorder-mcp(1), pup-server(1), pup(7)

## AUTHOR

qq1909698494@gmail.com
