// Created by Lu Ao (luao@bilibili.com) on 2026/05/18.

const PNG_TAIL = Buffer.from([0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);

// Splits a concatenated PNG byte stream (ffmpeg image2pipe) into individual PNG buffers.
export class PngStreamParser {
  private buf = Buffer.alloc(0);

  feed(chunk: Buffer): Buffer[] {
    this.buf = Buffer.concat([this.buf, chunk]);
    const frames: Buffer[] = [];
    while (true) {
      const idx = this.buf.indexOf(PNG_TAIL);
      if (idx < 0) break;
      const end = idx + PNG_TAIL.length;
      frames.push(Buffer.from(this.buf.subarray(0, end)));
      this.buf = this.buf.subarray(end);
    }
    return frames;
  }
}
