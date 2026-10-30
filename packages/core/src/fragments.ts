import type { Emote, MessageFragment } from './message';

const URL_PATTERN = /\bhttps?:\/\/[^\s<>"']+/gi;

/** Joins fragment texts back into plain text. */
export function fragmentsToText(fragments: MessageFragment[]): string {
  return fragments.map((fragment) => fragment.text).join('');
}

/** Splits text fragments on URLs, producing `link` fragments. */
export function linkifyFragments(fragments: MessageFragment[]): MessageFragment[] {
  const result: MessageFragment[] = [];
  for (const fragment of fragments) {
    if (fragment.type !== 'text') {
      result.push(fragment);
      continue;
    }
    let lastIndex = 0;
    for (const match of fragment.text.matchAll(URL_PATTERN)) {
      const index = match.index ?? 0;
      if (index > lastIndex) result.push({ type: 'text', text: fragment.text.slice(lastIndex, index) });
      result.push({ type: 'link', text: match[0], url: match[0] });
      lastIndex = index + match[0].length;
    }
    if (lastIndex < fragment.text.length) result.push({ type: 'text', text: fragment.text.slice(lastIndex) });
  }
  return result;
}

/**
 * Replaces whole words in text fragments with emotes from a lookup table.
 * Used for third-party emote providers (7TV, BTTV, FFZ) that platforms do not
 * resolve themselves.
 */
export function applyEmoteTable(
  fragments: MessageFragment[],
  lookup: (word: string) => Emote | undefined,
): MessageFragment[] {
  const result: MessageFragment[] = [];
  for (const fragment of fragments) {
    if (fragment.type !== 'text') {
      result.push(fragment);
      continue;
    }
    let buffer = '';
    for (const part of fragment.text.split(/(\s+)/)) {
      const emote = part.trim() ? lookup(part) : undefined;
      if (emote) {
        if (buffer) result.push({ type: 'text', text: buffer });
        buffer = '';
        result.push({ type: 'emote', text: part, emote });
      } else {
        buffer += part;
      }
    }
    if (buffer) result.push({ type: 'text', text: buffer });
  }
  return result;
}
