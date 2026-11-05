import { sha256Hex } from '@chatto/share';

/** Unpadded base64url of some bytes. */
export function base64Url(bytes: Uint8Array): string {
  let text = '';
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export const defaultRandom = (length: number) => crypto.getRandomValues(new Uint8Array(length));

/** A secret token: 32 random bytes. */
export const newToken = (random: (length: number) => Uint8Array) => base64Url(random(32));

/** A record id such as `thm_k3x9…`: 12 random bytes, readable in logs. */
export const newId = (prefix: string, random: (length: number) => Uint8Array) => `${prefix}_${base64Url(random(12))}`;

/** Hash of a secret or personal value; `salt` keeps hashes of guessable values (addresses) from being reversed. */
export const hashOf = (value: string, salt = '') => sha256Hex(`${salt}\u0000${value}`);
