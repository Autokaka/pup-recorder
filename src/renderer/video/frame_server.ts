// Created by Lu Ao (luao@bilibili.com) on 2026/05/18.

import { randomUUID } from "crypto";
import { DecodeSession } from "./decode_session";
import { probe } from "./ffprobe";

export interface VideoMeta {
  id: string;
  width: number;
  height: number;
  fps: number;
  duration: number;
}

export interface OpenOptions {
  src: string;
  fps: number;
}

// Registry of decode sessions keyed by opaque id; the pup-frame protocol layer is the only caller.
export class FrameServer {
  private sessions = new Map<string, DecodeSession>();

  async open(opts: OpenOptions): Promise<VideoMeta> {
    const info = await probe(opts.src);
    const id = randomUUID();
    const meta: VideoMeta = { id, width: info.width, height: info.height, fps: opts.fps, duration: info.duration };
    const frameCount = Math.max(1, Math.round(info.duration * opts.fps));
    this.sessions.set(id, new DecodeSession(meta, opts.src, frameCount));
    return meta;
  }

  getFrame(id: string, idx: number): Promise<Buffer> {
    return this.must(id).getFrame(idx);
  }

  close(id: string): void {
    const s = this.sessions.get(id);
    if (!s) return;
    s.close();
    this.sessions.delete(id);
  }

  // Render-end / abort safety net: the shim only closes sessions on DOM removal.
  closeAll(): void {
    for (const id of [...this.sessions.keys()]) this.close(id);
  }

  private must(id: string): DecodeSession {
    const s = this.sessions.get(id);
    if (!s) throw new Error(`frame-server: unknown session id=${id}`);
    return s;
  }
}

export const frameServer = new FrameServer();
