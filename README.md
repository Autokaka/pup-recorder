# pup-recorder(1)

## NAME

pup-recorder - record web pages as video

## SYNOPSIS

```
pup <source> [-w n] [-h n] [-f n] [-t n] [-o path] [-a] [-s] [--use-inner-proxy]
```

## DESCRIPTION

Electron offscreen rendering to MP4 (H.264). With `-a`: WebM (VP9) + MOV (HEVC alpha).

## OPTIONS

```
<source>                  file://, http(s)://, or data: URI
-w, --width <n>           default 1920
-h, --height <n>          default 1080
-f, --fps <n>             default 30
-t, --duration <n>        seconds, default 5
-o, --out-dir <path>      default "out"
-a, --with-alpha-channel  output webm+mov instead of mp4
-s, --with-audio          capture system audio
    --use-inner-proxy
```

## ENVIRONMENT

```
PUP_LOG_LEVEL        0-3, default 2
PUP_USE_INNER_PROXY  1=on
PUP_FFMPEG_PATH      default "ffmpeg"
PUP_DISABLE_GPU      1=on
```

## API

```typescript
import { pup } from "pup-recorder";

const { options, files } = await pup(source, {
  width?, height?, fps?, duration?, outDir?,
  withAlphaChannel?, withAudio?, useInnerProxy?,
  cancelQuery?, onProgress?,
});
// files: { mp4?, webm?, mov?, cover }
```

## FILES

```
dist/cli.js    dist/index.js    rust/*.node    x265/
```

## EXAMPLES

```sh
pup https://example.com -t 5
pup file:///path/to/page.html -a -t 10
pup https://example.com -s -w 1280 -h 720 -f 60 -t 10 -o /tmp/out
```

## SEE ALSO

pup-recorder-mcp(1), pup-server(1), pup(7)

## AUTHOR

qq1909698494@gmail.com
