// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/13.

import { HardwareContext } from "node-av/api";
import {
  AV_PIX_FMT_YUVA420P,
  AV_SAMPLE_FMT_FLT,
  AV_SAMPLE_FMT_FLTP,
  FF_ENCODER_AAC,
  FF_ENCODER_LIBOPUS,
  FF_ENCODER_LIBX265,
  FF_HWDEVICE_TYPE_CUDA,
  FF_HWDEVICE_TYPE_VIDEOTOOLBOX,
} from "node-av/constants";

import { logger } from "../logging";
import { AudioEncoder } from "./audio";
import { CodecState } from "./codec";
import { NvencDualLayerEncoder } from "./hevc_alpha/nvenc";
import { FF_ENCODER_LIBVPX_VP9 } from "./misc";
import type { FormatMuxer } from "./muxer";
import type { SinkKind, SinkOptions } from "./sink";
import { VideoEncoder } from "./video";
import { VideoToolboxEncoder } from "./videotoolbox";

const TAG = "[Encoder]";

export type HwEncoder = VideoToolboxEncoder | NvencDualLayerEncoder;

export interface VideoSetup {
  video?: VideoEncoder;
  hwVideo?: HwEncoder;
  codec?: CodecState;
  hw?: HardwareContext;
  ownsHw: boolean;
}

export interface HwVideoFactoryOptions {
  width: number;
  height: number;
  fps: number;
  bitrate?: number;
  disableHwCodec?: boolean;
  sharedHw?: HardwareContext;
}

// WebM VP9 realtime is already the fast path; row-mt + threads cover the rest.
const WEBM_VP9_OPTS = {
  deadline: "realtime",
  "cpu-used": "8",
  "row-mt": "1",
  threads: "4",
} as const;

const MP4_AUDIO = {
  outSampleRate: 44_100,
  outSampleFmt: AV_SAMPLE_FMT_FLTP,
  codecName: FF_ENCODER_AAC,
} as const;

// Opus rejects 44.1k.
const WEBM_AUDIO = {
  outSampleRate: 48_000,
  outSampleFmt: AV_SAMPLE_FMT_FLT,
  codecName: FF_ENCODER_LIBOPUS,
} as const;

export async function createMp4Video(opts: SinkOptions, muxer: FormatMuxer): Promise<VideoSetup> {
  const { width, height, fps, disableHwCodec, sharedHw } = opts;
  return createHwVideoEncoder({ width, height, fps, disableHwCodec, sharedHw }, muxer);
}

export async function createWebmVideo(opts: SinkOptions, muxer: FormatMuxer): Promise<VideoSetup> {
  const { width, height, fps } = opts;
  const video = await VideoEncoder.create({
    width,
    height,
    fps,
    codecName: FF_ENCODER_LIBVPX_VP9,
    codecOpts: WEBM_VP9_OPTS,
    bitrate: 4_000_000,
    pixelFormat: AV_PIX_FMT_YUVA420P,
    muxer,
  });
  return {
    video,
    codec: await CodecState.create(width, height),
    ownsHw: false,
  };
}

// Opus rejects 44.1k.
export function createAudio(kind: SinkKind, muxer: FormatMuxer): Promise<AudioEncoder> {
  const cfg = kind === "mp4" ? MP4_AUDIO : WEBM_AUDIO;
  return AudioEncoder.create({
    ...cfg,
    globalHeader: true,
    bitrate: 128_000,
    muxer,
  });
}

export async function createHwVideoEncoder(opts: HwVideoFactoryOptions, muxer: FormatMuxer): Promise<VideoSetup> {
  const { width, height, fps, bitrate = 8_000_000, disableHwCodec = false, sharedHw } = opts;
  const hw = sharedHw ?? (disableHwCodec ? undefined : (HardwareContext.auto() ?? undefined));
  const ownsHw = !sharedHw && !!hw;

  try {
    if (hw?.deviceTypeName === FF_HWDEVICE_TYPE_VIDEOTOOLBOX && hw.getEncoderCodec("hevc")) {
      logger.debug(TAG, "using VideoToolbox HEVC alpha encoder");
      const hwVideo = await VideoToolboxEncoder.create({ width, height, fps, hw, bitrate, muxer });
      return { hwVideo, hw, ownsHw };
    }
    if (hw?.deviceTypeName === FF_HWDEVICE_TYPE_CUDA && hw.getEncoderCodec("hevc")) {
      logger.debug(TAG, "using NVENC dual-layer HEVC alpha encoder");
      const hwVideo = await NvencDualLayerEncoder.create({ width, height, fps, hw, bitrate, muxer });
      return { hwVideo, hw, ownsHw };
    }
  } catch (e) {
    logger.warn(TAG, "Hardware codec session limits reached, use software encoder", e);
    if (ownsHw) {
      hw?.dispose();
    }
  }

  logger.debug(TAG, "using software libx265 HEVC alpha encoder");
  // Partial-construction safety: free the video encoder if CodecState.create throws; move() disowns on success.
  using stack = new DisposableStack();
  const video = stack.use(
    await VideoEncoder.create({
      width,
      height,
      fps,
      codecName: FF_ENCODER_LIBX265,
      codecTag: "hvc1",
      codecOpts: { preset: "fast", "x265-params": "log-level=1:bframes=3:pools=+:frame-threads=0" },
      bitrate,
      pixelFormat: AV_PIX_FMT_YUVA420P,
      muxer,
    }),
  );
  const codec = stack.use(await CodecState.create(width, height));
  stack.move();
  return { video, codec, ownsHw: false };
}
