import type {
  EncodedAudioChunk,
  EncodedAudioChunkMetadataJs,
  EncodedVideoChunk,
  EncodedVideoChunkMetadataJs,
} from "@napi-rs/webcodecs";

export interface MediaMuxer {
  addVideoChunk(chunk: EncodedVideoChunk, meta?: EncodedVideoChunkMetadataJs): void;
  addAudioChunk(chunk: EncodedAudioChunk, meta?: EncodedAudioChunkMetadataJs): void;
  finalize(): Promise<Uint8Array>;
}
