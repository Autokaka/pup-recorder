# PUP-RECORDER(1)

## NAME

pup-recorder — record web pages as video

## SYNOPSIS

    pup source [-W width] [-H height] [-f fps] [-t duration] [-o file] [-a] [-d]

## OPTIONS

    source                    file://, http(s)://, or data: URI
    -W, --width <number>      default: 1920
    -H, --height <number>     default: 1080
    -f, --fps <number>        default: 30
    -t, --duration <number>   default: 5
    -o, --out-file <path>     default: output.mp4
    -a, --with-audio
    -d, --deterministic       frame-by-frame rendering mode
    --use-inner-proxy         use Bilibili inner proxy

## ENVIRONMENT

    PUP_LOG_LEVEL              0=error 1=warn 2=info 3=debug (default: 2)
    PUP_USE_INNER_PROXY        1=on
    PUP_DISABLE_GPU            1=on
    PUP_DETERMINISTIC          1=on
    PUP_EXPERIMENTAL_PUPPETEER 1=on (Linux puppeteer mode)

## API

```ts
import { pup } from "pup-recorder";

const result = await pup(source, {
  width, height, fps, duration, outFile,
  withAudio, deterministic, useInnerProxy,
  signal, onProgress,
});
```

## SEE ALSO

pup-server(1), pup-recorder-mcp(1), pup(7)
