import type { ChatEvent, ChatTheme } from '@chatto/core';
import { act, render, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ChatView } from './ChatView';
import type { FeedItem } from './feed';
import { MOCK_USERS, createSpecimenEvents, mockMessage } from './mock';
import { PRESET_THEMES, getPresetTheme } from './themes';
import { useChatFeed } from './useChatFeed';

const theme = (patch: (draft: ChatTheme) => void = () => undefined): ChatTheme => {
  const draft = structuredClone(getPresetTheme('matcha-glass')!);
  patch(draft);
  return draft;
};

const toItems = (events: ChatEvent[]): FeedItem[] =>
  events.flatMap((event, index): FeedItem[] => {
    if (event.type === 'message') return [{ kind: 'message', key: `m${index}`, receivedAt: 0, message: event.message }];
    if (event.type === 'notice') return [{ kind: 'notice', key: `n${index}`, receivedAt: 0, notice: event.notice }];
    return [];
  });

const message = (text: string, author = MOCK_USERS[1]!) =>
  ({ type: 'message', message: mockMessage(author, [{ type: 'text', text }]) }) as const;

describe('ChatView', () => {
  it('renders every specimen part with the public chatto-* classes', () => {
    const { container } = render(<ChatView theme={theme()} items={toItems(createSpecimenEvents())} />);
    for (const className of [
      'chatto-root',
      'chatto-list',
      'chatto-message',
      'chatto-notice',
      'chatto-author',
      'chatto-body',
      'chatto-badges',
      'chatto-emote',
      'chatto-mention',
      'chatto-link',
      'chatto-reply',
      'chatto-event-title',
    ]) {
      expect(container.querySelector(`.${className}`), className).not.toBeNull();
    }
  });

  it('exposes roles, events and actions as data attributes', () => {
    const { container } = render(<ChatView theme={theme()} items={toItems(createSpecimenEvents())} />);
    expect(container.querySelector('.chatto-message[data-roles~="broadcaster"]')).not.toBeNull();
    expect(container.querySelector('.chatto-message[data-action]')).not.toBeNull();
    expect(container.querySelector('.chatto-message[data-highlight~="first-message"]')).not.toBeNull();
    expect(container.querySelector('[data-event="twitch:cheer"]')).not.toBeNull();
    const root = container.querySelector('.chatto-root')!;
    expect(root.getAttribute('data-theme-id')).toBe('matcha-glass');
  });

  it('every preset renders the specimen without throwing', () => {
    for (const preset of PRESET_THEMES) {
      const { unmount, container } = render(<ChatView theme={preset} items={toItems(createSpecimenEvents())} />);
      expect(container.querySelectorAll('.chatto-message').length).toBeGreaterThan(0);
      unmount();
    }
  });

  it('renders chat text as text, never as markup', () => {
    const { container } = render(
      <ChatView theme={theme()} items={toItems([message('<img src=x onerror=alert(1)><b>bold</b>')])} />,
    );
    expect(container.querySelector('.chatto-body img')).toBeNull();
    expect(container.querySelector('.chatto-body b')).toBeNull();
    expect(container.querySelector('.chatto-body')!.textContent).toBe('<img src=x onerror=alert(1)><b>bold</b>');
  });

  it('passes the user colour through a CSS variable', () => {
    const { container } = render(<ChatView theme={theme()} items={toItems([message('hi')])} />);
    const author = container.querySelector<HTMLElement>('.chatto-author')!;
    expect(author.style.getPropertyValue('--chatto-user-color')).toBe(MOCK_USERS[1]!.color);
  });

  it('hides avatars, timestamps and badges when the theme turns them off', () => {
    const items = toItems([message('hi', MOCK_USERS[0]!)]);
    const shown = render(
      <ChatView
        theme={theme((t) => {
          t.avatar.show = true;
          t.timestamp.show = true;
          t.badges.show = true;
        })}
        items={items}
      />,
    );
    expect(shown.container.querySelector('.chatto-avatar')).not.toBeNull();
    expect(shown.container.querySelector('.chatto-time')).not.toBeNull();
    expect(shown.container.querySelector('.chatto-badges')).not.toBeNull();
    shown.unmount();

    const hidden = render(
      <ChatView
        theme={theme((t) => {
          t.avatar.show = false;
          t.timestamp.show = false;
          t.badges.show = false;
        })}
        items={items}
      />,
    );
    expect(hidden.container.querySelector('.chatto-avatar')).toBeNull();
    expect(hidden.container.querySelector('.chatto-time')).toBeNull();
    expect(hidden.container.querySelector('.chatto-badges')).toBeNull();
  });

  it('puts the newest message first for top-down lists', () => {
    const items = toItems([message('first'), message('second')]);
    const { container } = render(
      <ChatView
        theme={theme((t) => {
          t.list.direction = 'top-down';
        })}
        items={items}
      />,
    );
    const bodies = [...container.querySelectorAll('.chatto-body')].map((node) => node.textContent);
    expect(bodies).toEqual(['second', 'first']);
  });

  it('scopes custom CSS to its own root so two views do not leak into each other', () => {
    const custom = theme((t) => {
      t.customCss = '.chatto-author { color: red; }';
    });
    const { container } = render(
      <>
        <ChatView theme={custom} items={[]} />
        <ChatView theme={theme()} items={[]} />
      </>,
    );
    const [first, second] = [...container.querySelectorAll<HTMLElement>('.chatto-root')];
    const css = first!.querySelector('style')!.textContent!;
    expect(css).toContain(`[data-chatto-id="${first!.dataset.chattoId}"]`);
    expect(css).toContain('color: red');
    expect(second!.querySelector('style')?.textContent ?? '').not.toContain('color: red');
  });

  it('a blank theme emits no generated styles, only the custom CSS', () => {
    const blank = { ...theme(), base: 'blank' as const, customCss: '' };
    const { container } = render(<ChatView theme={blank} items={toItems([message('hi')])} />);
    expect(container.querySelector('style')).toBeNull();
    expect(container.querySelector('.chatto-message')).not.toBeNull();
  });
});

describe('useChatFeed', () => {
  afterEach(() => vi.useRealTimers());

  it('removes deleted, cleared and banned messages from the screen immediately', () => {
    const options = theme().options;
    const { result } = renderHook(() => useChatFeed(options));
    const a = message('a', MOCK_USERS[1]!);
    const b = message('b', MOCK_USERS[2]!);
    const c = message('c', MOCK_USERS[2]!);

    act(() => [a, b, c].forEach((event) => result.current.push(event)));
    expect(result.current.items).toHaveLength(3);

    act(() =>
      result.current.push({ type: 'message-deleted', platform: 'twitch', channelId: '1', messageId: a.message.id }),
    );
    expect(result.current.items.map((item) => item.kind === 'message' && item.message.text)).toEqual(['b', 'c']);

    act(() =>
      result.current.push({ type: 'user-cleared', platform: 'twitch', channelId: '1', userId: MOCK_USERS[2]!.id }),
    );
    expect(result.current.items).toEqual([]);

    act(() => result.current.push(message('d')));
    act(() => result.current.push({ type: 'chat-cleared', platform: 'twitch', channelId: '1' }));
    expect(result.current.items).toEqual([]);
  });

  it('expires messages after the theme lifetime', () => {
    vi.useFakeTimers();
    const options = { ...theme().options, messageLifetime: 2 };
    const { result } = renderHook(() => useChatFeed(options));
    act(() => result.current.push(message('soon gone')));
    expect(result.current.items).toHaveLength(1);
    act(() => void vi.advanceTimersByTime(2600));
    expect(result.current.items).toHaveLength(0);
  });

  it('resets to a backlog, e.g. on the hello frame', () => {
    const { result } = renderHook(() => useChatFeed(theme().options));
    act(() => result.current.push(message('old')));
    act(() => result.current.reset([message('x'), message('y')]));
    expect(result.current.items).toHaveLength(2);
  });
});
