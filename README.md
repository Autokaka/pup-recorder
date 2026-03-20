# pup-recorder(1)

## NAME

pup-recorder - record web pages as video

## SYNOPSIS

```
pup source [-W width] [-H height] [-f fps] [-t duration] [-o dir] [-F formats] [-a] [--use-inner-proxy]
```

## DESCRIPTION

Renders a web page offscreen via Electron and encodes the result to one or
more video formats.  Both mp4 and webm support alpha transparency and
optional audio.

## OPTIONS

```
source
    file://, http(s)://, or data: URI of the page to record.

-W width, --width=width
    Frame width in pixels.  Default: 1920.

-H height, --height=height
    Frame height in pixels.  Default: 1080.

-f fps, --fps=fps
    Frames per second.  Default: 30.

-t duration, --duration=duration
    Recording duration in seconds.  Default: 5.

-o dir, --out-dir=dir
    Output directory.  Default: out.

-F formats, --formats=formats
    Comma-separated list of output formats.  Allowed values: mp4, webm.
    Default: mp4.

-a, --with-audio
    Capture and encode system audio.

--use-inner-proxy
    Route resource requests through the Bilibili inner proxy.
```

## ENVIRONMENT

```
PUP_LOG_LEVEL        Verbosity: 0=error 1=warn 2=info 3=debug.  Default: 2.
PUP_USE_INNER_PROXY  Set to 1 to enable the inner proxy globally.
PUP_DISABLE_GPU      Set to 1 to disable GPU acceleration.
```

## API

```typescript
import { pup, type VideoFormat } from "pup-recorder";

const { options, files } = await pup(source, {
  width?, height?, fps?, duration?, outDir?,
  formats?: VideoFormat[],
  withAudio?, useInnerProxy?,
  cancelQuery?, onProgress?,
});
// files: { mp4?, webm?, cover }
```

## FILES

```
dist/cli.js     CLI entry point
dist/index.js   library entry point
```

## EXAMPLES

```sh
pup https://example.com -t 5
pup file:///path/to/page.html -F webm -t 10
pup https://example.com -F mp4,webm -a -W 1280 -H 720 -f 60 -t 10 -o /tmp/out
```

## SEE ALSO

pup-recorder-mcp(1), pup-server(1), pup(7)

## AUTHOR

qq1909698494@gmail.com
