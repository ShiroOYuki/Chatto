/** Shape of a soundcn sound module (from soundcn's `sound-types.ts`, MIT). */
export interface SoundAsset {
  name: string;
  /** Base64 data URI, e.g. `data:audio/mpeg;base64,...`. */
  dataUri: string;
  /** Seconds. */
  duration: number;
  format: 'mp3' | 'wav' | 'ogg';
  license: 'CC0' | 'OGA-BY' | 'MIT';
  author: string;
}
