// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/06.

import type { NativeImage } from "electron";

export function isEmpty(image: NativeImage) {
  const size = image.getSize();
  if (size.width === 0 || size.height === 0) return true;
  return image.isEmpty();
}
