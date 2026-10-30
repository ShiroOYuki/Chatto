import { describe, expect, it } from 'vitest';
import { appendRule, buildSelector, selectorAtCursor, toQueryable, type InspectedElement } from './cssSelector';

const css = `/* note { } */
.chatto-author {
  color: red;
}

@media (min-width: 10px) {
  .chatto-body::before { content: 'x'; }
}
.chatto-message[data-roles~="vip"]
  .chatto-header { }`;

describe('selectorAtCursor', () => {
  it('finds the rule around the cursor', () => {
    expect(selectorAtCursor(css, css.indexOf('color'))).toBe('.chatto-author');
    expect(selectorAtCursor(css, css.indexOf('.chatto-author') + 3)).toBe('.chatto-author');
    expect(selectorAtCursor(css, css.indexOf("'x'"))).toBe('.chatto-body::before');
    expect(selectorAtCursor(css, css.indexOf('vip'))).toBe('.chatto-message[data-roles~="vip"]\n  .chatto-header');
  });

  it('ignores at-rules and comments', () => {
    expect(selectorAtCursor(css, css.indexOf('min-width'))).toBeNull();
    expect(selectorAtCursor(css, 4)).toBe('.chatto-author');
  });
});

describe('selector helpers', () => {
  it('strips what querySelectorAll cannot match', () => {
    expect(toQueryable('.chatto-author::before')).toBe('.chatto-author');
    expect(toQueryable(':scope .chatto-body:hover')).toBe('.chatto-root .chatto-body');
  });

  it('builds scoped selectors', () => {
    const info: InspectedElement = {
      part: 'chatto-author',
      row: 'message',
      roles: ['moderator'],
      highlights: [],
      user: 'kuma_mod',
      platform: 'twitch',
    };
    expect(buildSelector(info, { kind: 'all' })).toBe('.chatto-author');
    expect(buildSelector(info, { kind: 'role', role: 'moderator' })).toBe(
      '.chatto-message[data-roles~="moderator"] .chatto-author',
    );
    expect(
      buildSelector({ ...info, part: 'chatto-notice', row: 'notice' }, { kind: 'event', event: 'twitch:raid' }),
    ).toBe('.chatto-notice[data-event="twitch:raid"]');
  });

  it('appends a rule with the cursor inside it', () => {
    const result = appendRule('a {}\n', '.chatto-body');
    expect(result.css).toBe('a {}\n\n.chatto-body {\n  \n}\n');
    expect(result.css.slice(result.cursor - 4, result.cursor)).toBe('{\n  ');
  });
});
