# pup-recorder(1)

## NAME

pup-recorder - record web pages as video

## SYNOPSIS

```
pup source [-W width] [-H height] [-f fps] [-t duration] [-o file] [-a] [-d] [--use-inner-proxy]
```

## OPTIONS

```
source                    file://, http(s)://, or data: URI

-W, --width <number>      default: 1920
-H, --height <number>     default: 1080
-f, --fps <number>        default: 30
-t, --duration <number>   default: 5
-o, --out-file <path>     default: output.mp4
-a, --with-audio
-d, --deterministic       frame-by-frame rendering mode
--use-inner-proxy         use Bilibili inner proxy
```

## ENVIRONMENT

```
PUP_LOG_LEVEL        0=error 1=warn 2=info 3=debug. default: 2
PUP_USE_INNER_PROXY  1=on
PUP_DISABLE_GPU      1=on
PUP_DETERMINISTIC    1=on
```

## API

```typescript
import { pup } from "pup-recorder";

const result = await pup(source, {
  width?: number,
  height?: number,
  fps?: number,
  duration?: number,
  outFile?: string,
  withAudio?: boolean,
  deterministic?: boolean,
  useInnerProxy?: boolean,
  signal?: AbortSignal,
  onProgress?: (progress: number) => void,
});
// result: { options, written, jank, outFile, audio? }
```

## FILES

```
dist/cli.cjs
dist/index.js
```

## EXAMPLES

```sh
pup https://example.com -t 5
pup file:///path/to/page.html -d -t 10
pup https://example.com -a -W 1280 -H 720 -f 60 -t 10
```

## SEE ALSO

pup-recorder-mcp(1), pup-server(1), pup(7)

## AUTHOR

qq1909698494@gmail.com
