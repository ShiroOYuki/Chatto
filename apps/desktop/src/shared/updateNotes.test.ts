import { describe, expect, it, vi } from 'vitest';
import {
  changelogFileUrl,
  compareVersions,
  fetchUpdateNotes,
  noteTextParts,
  notesBetween,
  parseUpdateNotes,
  type UpdateNote,
} from './updateNotes';

const text = (en: string) => ({ en, 'zh-TW': `中 ${en}` });
const entry = (version: string, items = ['A change']) => ({
  version,
  date: '2026-11-08',
  sections: [{ kind: 'new', items: items.map(text) }],
});

describe('compareVersions', () => {
  it('compares each part as a number, with or without the v', () => {
    expect(compareVersions('v0.10.0', '0.9.9')).toBeGreaterThan(0);
    expect(compareVersions('0.3.1', 'v0.3.1')).toBe(0);
    expect(compareVersions('0.3.0', '0.3.1')).toBeLessThan(0);
  });
});

describe('parseUpdateNotes', () => {
  it('keeps valid versions newest first', () => {
    const notes = parseUpdateNotes({ app: [entry('v0.2.0'), entry('v0.3.0')] });
    expect(notes?.map((n) => n.version)).toEqual(['v0.3.0', 'v0.2.0']);
    expect(notes?.[0]?.sections[0]?.items[0]).toEqual(text('A change'));
  });

  it('is null for anything that is not a changelog', () => {
    expect(parseUpdateNotes(null)).toBeNull();
    expect(parseUpdateNotes('<html>')).toBeNull();
    expect(parseUpdateNotes({ app: 'x' })).toBeNull();
  });

  it('drops entries, sections and items it cannot show', () => {
    const notes = parseUpdateNotes({
      app: [
        { version: 'next', sections: [] },
        {
          version: 'v1.0.0',
          summary: { en: 'Only English' },
          sections: [
            { kind: 'renamed', items: [text('Later kind')] },
            { kind: 'fixed', items: [text('Kept'), { en: 'No Chinese' }, 'plain', { en: 1, 'zh-TW': 2 }] },
          ],
        },
      ],
    });
    expect(notes).toEqual([{ version: 'v1.0.0', sections: [{ kind: 'fixed', items: [text('Kept')] }] }]);
  });
});

describe('notesBetween', () => {
  const notes = parseUpdateNotes({ app: [entry('v0.4.0'), entry('v0.3.2'), entry('v0.3.1'), entry('v0.3.0')] })!;

  it('lists every version after the current one up to the new one', () => {
    expect(notesBetween(notes, '0.3.0', '0.3.2')?.map((n) => n.version)).toEqual(['v0.3.2', 'v0.3.1']);
  });

  it('is null when the new version is not in the file', () => {
    expect(notesBetween(notes, '0.3.0', '0.5.0')).toBeNull();
  });
});

describe('noteTextParts', () => {
  it('splits code marked with backticks', () => {
    expect(noteTextParts('Use `:lang()` in CSS')).toEqual([
      { text: 'Use ', code: false },
      { text: ':lang()', code: true },
      { text: ' in CSS', code: false },
    ]);
  });

  it('leaves an unpaired backtick as text', () => {
    expect(noteTextParts('a ` b')).toEqual([{ text: 'a ` b', code: false }]);
  });
});

describe('fetchUpdateNotes', () => {
  const respond = (body: string, ok = true) =>
    vi.fn(async () => ({ ok, text: async () => body }) as unknown as Response);

  it('reads the new release’s changelog file', async () => {
    const fetchImpl = respond(JSON.stringify({ app: [entry('v0.3.1'), entry('v0.3.0')] }));
    const notes = (await fetchUpdateNotes('0.3.0', '0.3.1', fetchImpl)) as UpdateNote[];
    expect(fetchImpl).toHaveBeenCalledWith(changelogFileUrl('0.3.1'), expect.anything());
    expect(changelogFileUrl('0.3.1')).toBe(
      'https://github.com/ShiroOYuki/Chatto/releases/download/v0.3.1/changelog.json',
    );
    expect(notes.map((n) => n.version)).toEqual(['v0.3.1']);
  });

  it('is null when the file is missing, broken or the request fails', async () => {
    expect(await fetchUpdateNotes('0.3.0', '0.3.1', respond('', false))).toBeNull();
    expect(await fetchUpdateNotes('0.3.0', '0.3.1', respond('{'))).toBeNull();
    const failing = vi.fn(async () => {
      throw new Error('offline');
    });
    expect(await fetchUpdateNotes('0.3.0', '0.3.1', failing)).toBeNull();
  });
});
