import { describe, expect, it } from 'vitest';
import { parseUpdateNotes } from '../../desktop/src/shared/updateNotes';
import { CHANGELOG } from './changelog.mjs';
import { changelogJson } from './changelogJson.mjs';

describe('changelogJson', () => {
  it('lists every released version of the app, newest first, without upcoming work', () => {
    const json = changelogJson();
    const released = CHANGELOG.app.filter((entry) => !entry.upcoming);
    expect(json.app.map((entry) => entry.version)).toEqual(released.map((entry) => entry.version));
    expect(json.app.every((entry) => 'upcoming' in entry === false && 'download' in entry === false)).toBe(true);
  });

  it('is what the app reads, item for item', () => {
    const json = JSON.parse(JSON.stringify(changelogJson()));
    const notes = parseUpdateNotes(json);
    expect(notes).not.toBeNull();
    const items = (list: { sections: { items: unknown[] }[] }[]) =>
      list.reduce((sum, entry) => sum + entry.sections.reduce((n, section) => n + section.items.length, 0), 0);
    expect(items(notes!)).toBe(items(json.app));
  });
});
