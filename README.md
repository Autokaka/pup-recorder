# PUP-RECORDER(1)

## NAME

pup-recorder — record web pages as video

## SYNOPSIS

    pup source [-W width] [-H height] [-f fps] [-t duration] [-o file] [-a] [-d]
               [--disable-gpu] [--disable-hw-codec] [--window-tolerant]
               [--use-inner-proxy]

## OPTIONS

    source                    file://, http(s)://, or data: URI
    -W, --width <number>      default: 1920
    -H, --height <number>     default: 1080
    -f, --fps <number>        default: 30
    -t, --duration <number>   default: 5 (seconds)
    -o, --out-file <path>     default: output.mp4
    -a, --with-audio
    -d, --deterministic       frame-by-frame via CDP virtual time
    --use-inner-proxy         Bilibili inner proxy
    --disable-gpu             force SwiftShader software rendering
    --disable-hw-codec        software x265 instead of NVENC/VideoToolbox
    --window-tolerant         accept dom-ready when did-stop-loading hangs

## ENVIRONMENT

    PUP_LOG_LEVEL          0=error 1=warn 2=info 3=debug (default: 2)
    PUP_USE_INNER_PROXY    1=on
    PUP_DISABLE_GPU        1=on
    PUP_DISABLE_HW_CODEC   1=on
    PUP_DETERMINISTIC      1=on
    PUP_WINDOW_TOLERANT    1=on

CLI flags override environment variables.

## API

```ts
import { pup } from "pup-recorder";

const result = await pup(source, {
  width, height, fps, duration, outFile,
  withAudio, deterministic, useInnerProxy,
  disableGpu, disableHwCodec, windowTolerant,
  signal, onProgress,
});
// => { written, jank, outFile, options }
```

## SEE ALSO

pup-server(1), pup-recorder-mcp(1), pup(7)
