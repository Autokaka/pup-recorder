// Created by Autokaka (qq1909698494@gmail.com) on 2026/04/13.

import { HardwareContext } from "node-av/api";
import {
  AV_PIX_FMT_YUVA420P,
  FF_ENCODER_LIBX265,
  FF_HWDEVICE_TYPE_CUDA,
  FF_HWDEVICE_TYPE_VIDEOTOOLBOX,
} from "node-av/constants";

import { logger } from "../logging";
import { CodecState } from "./codec";
import type { FormatMuxer } from "./muxer";
import { NvencDualLayerEncoder } from "./hevc_alpha/nvenc";
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
    if (ownsHw) hw?.dispose();
  }

  logger.debug(TAG, "using software libx265 HEVC alpha encoder");
  const video = await VideoEncoder.create({
    width,
    height,
    fps,
    codecName: FF_ENCODER_LIBX265,
    codecTag: "hvc1",
    codecOpts: { preset: "medium", "x265-params": "log-level=1:bframes=3:pools=+:frame-threads=0" },
    bitrate,
    pixelFormat: AV_PIX_FMT_YUVA420P,
    muxer,
  });
  return { video, codec: await CodecState.create(width, height), ownsHw: false };
}
