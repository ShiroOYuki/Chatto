import { describe, expect, it } from 'vitest';
import { CHANGELOG } from './changelog.mjs';
import { releaseNotes } from './releaseNotes.mjs';

describe('releaseNotes', () => {
  it('writes English first, then Traditional Chinese', () => {
    const notes = releaseNotes('v0.1.1');
    expect(notes.indexOf('### New')).toBeLessThan(notes.indexOf('## 繁體中文'));
    expect(notes.indexOf('## 繁體中文')).toBeLessThan(notes.indexOf('### 新功能'));
    expect(notes).toContain('- Settings are split into General, Appearance, Advanced and About');
    expect(notes).toContain('- 設定頁分成一般、外觀、進階、關於四個區塊');
    expect(notes).toContain('### Fixed');
    expect(notes).toContain('### 修正');
  });

  it('adds the OBS plugin that comes with the release', () => {
    const notes = releaseNotes('v0.1.0');
    expect(notes).toContain('### OBS plugin v0.1.0');
    expect(notes).toContain('### OBS 外掛 v0.1.0');
    expect(releaseNotes('v0.1.1')).not.toContain('OBS plugin v');
  });

  it('refuses a version the changelog does not have', () => {
    expect(() => releaseNotes('v9.9.9')).toThrow(/no entry for v9\.9\.9/);
  });

  it('every released entry of the app has a version and a date', () => {
    for (const entry of CHANGELOG.app.filter((e) => !e.upcoming)) {
      expect(entry.version).toMatch(/^v\d+\.\d+\.\d+$/);
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
