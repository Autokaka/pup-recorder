// Created by Lu Ao (luao@bilibili.com) on 2026/05/18.

import { createHash } from "crypto";
import { tmpdir } from "os";
import { join } from "path";
import { DecodeSession } from "./decode_session";
import { probe } from "./ffprobe";
import { localize } from "./src_cache";

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

interface Entry {
  session: DecodeSession;
  refs: number;
}

const FRAMES_ROOT = join(tmpdir(), "pup-video-frames");

export class FrameServer {
  private sessions = new Map<string, Entry>();

  async open(opts: OpenOptions): Promise<VideoMeta> {
    const id = key(opts.src, opts.fps);
    const hit = this.sessions.get(id);
    if (hit) {
      hit.refs++;
      return hit.session.meta;
    }
    const localPath = await localize(opts.src);
    const info = await probe(localPath);
    const meta: VideoMeta = { id, width: info.width, height: info.height, fps: opts.fps, duration: info.duration };
    const framesDir = join(FRAMES_ROOT, id);
    this.sessions.set(id, { session: new DecodeSession(meta, localPath, framesDir), refs: 1 });
    return meta;
  }

  getFrame(id: string, idx: number): Promise<Buffer> {
    const e = this.sessions.get(id);
    if (!e) throw new Error(`frame-server: unknown id=${id}`);
    return e.session.getFrame(idx);
  }

  close(id: string): void {
    const e = this.sessions.get(id);
    if (!e) return;
    if (--e.refs > 0) return;
    e.session.close();
    this.sessions.delete(id);
  }

  closeAll(): void {
    for (const [, e] of this.sessions) e.session.close();
    this.sessions.clear();
  }

}

function key(src: string, fps: number): string {
  return createHash("sha1").update(`${src}|${fps}`).digest("hex");
}

export const frameServer = new FrameServer();
