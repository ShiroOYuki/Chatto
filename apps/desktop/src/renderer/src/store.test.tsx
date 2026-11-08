import { createMockGiftBatch, MOCK_USERS, mockMessage, mockNotice } from '@chatto/chat-ui';
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeApi } from '../../../../../tests/fake-api';
import { api as mockedApi } from './api';
import { StoreProvider, useAppState, useChatLog } from './store';

vi.mock('./api', async () => {
  const { createFakeApi } = await import('../../../../../tests/fake-api');
  return { api: createFakeApi(), isMockApi: false };
});
const api = mockedApi as unknown as FakeApi;

let log: ReturnType<typeof useChatLog> | null = null;
function Probe() {
  const state = useAppState();
  log = useChatLog();
  return <div data-testid="login">{state?.auth.login ?? 'loading'}</div>;
}

const message = (author = MOCK_USERS[1]!) => ({
  type: 'message' as const,
  message: mockMessage(author, [{ type: 'text', text: 'hi' }]),
});

/** Renders the store and waits for the session snapshot from the main process. */
async function renderStore() {
  await act(async () => {
    render(
      <StoreProvider>
        <Probe />
      </StoreProvider>,
    );
  });
}

describe('StoreProvider', () => {
  beforeEach(() => api.resetControlLog());

  it('loads the app state and follows updates from the main process', async () => {
    render(
      <StoreProvider>
        <Probe />
      </StoreProvider>,
    );
    expect(await screen.findByText('shiraine_ciel')).toBeTruthy();
    act(() => api.pushState({ auth: { status: 'signed-in', login: 'other' } }));
    expect(screen.getByTestId('login').textContent).toBe('other');
  });

  it('keeps deleted messages in the moderation log, marked as deleted', async () => {
    await renderStore();
    const first = message(MOCK_USERS[1]!);
    const second = message(MOCK_USERS[2]!);
    act(() => {
      api.pushChat(first);
      api.pushChat(second);
      api.pushChat({ type: 'message-deleted', platform: 'twitch', channelId: '1', messageId: first.message.id });
    });
    expect(log!.entries).toHaveLength(2);
    expect(log!.entries.map((entry) => entry.kind === 'message' && entry.deleted)).toEqual([true, false]);

    act(() => api.pushChat({ type: 'user-cleared', platform: 'twitch', channelId: '1', userId: MOCK_USERS[2]!.id }));
    expect(log!.entries.every((entry) => entry.kind === 'message' && entry.deleted)).toBe(true);
  });

  it('counts messages, chatters, notices and deletions', async () => {
    await renderStore();
    const first = message(MOCK_USERS[1]!);
    act(() => {
      api.pushChat(first);
      api.pushChat(message(MOCK_USERS[1]!));
      api.pushChat(message(MOCK_USERS[2]!));
      api.pushChat({ type: 'notice', notice: mockNotice({ kind: 'raid', eventType: 'raid', systemText: 'raid!' }) });
      api.pushChat({ type: 'message-deleted', platform: 'twitch', channelId: '1', messageId: first.message.id });
    });
    expect(log!.stats).toMatchObject({
      totalMessages: 3,
      uniqueChatters: 2,
      noticeCount: 1,
      deletedCount: 1,
      rate: 3,
    });
    expect(log!.stats.history).toHaveLength(30);
  });

  it('logs a community gift as one entry with its gifted subs, counted once', async () => {
    await renderStore();
    const [lead, ...gifts] = createMockGiftBatch(5);
    act(() => [lead!, ...gifts].forEach((event) => api.pushChat(event)));
    expect(log!.entries).toHaveLength(1);
    const entry = log!.entries[0]!;
    expect(entry.kind === 'notice' && entry.members.map((member) => member.meta.recipient)).toHaveLength(5);
    expect(log!.stats.noticeCount).toBe(1);
  });

  it('caps the log at 500 entries and can be cleared', async () => {
    await renderStore();
    act(() => {
      for (let i = 0; i < 520; i += 1) api.pushChat(message());
    });
    expect(log!.entries).toHaveLength(500);
    act(() => log!.clear());
    expect(log!.entries).toHaveLength(0);
  });

  it('starts with the session the main process kept (a window reopened from the tray)', async () => {
    api.pushChat(message(MOCK_USERS[1]!));
    api.pushChat(message(MOCK_USERS[2]!));
    await renderStore();
    expect(log!.entries).toHaveLength(2);
    expect(log!.stats.totalMessages).toBe(2);
    act(() => api.pushChat(message()));
    expect(log!.entries).toHaveLength(3);
  });

  it('clears the chat log in the main process too', async () => {
    await renderStore();
    act(() => api.pushChat(message()));
    act(() => log!.clear());
    expect(api.clearChatLog).toHaveBeenCalled();
    expect((await api.getControlLog()).chatLog.entries).toHaveLength(0);
  });

  it('stops listening when unmounted', () => {
    const { unmount } = render(
      <StoreProvider>
        <Probe />
      </StoreProvider>,
    );
    unmount();
    expect(() => api.pushChat(message())).not.toThrow();
  });
});
