import { createMockMessage, mockNotice } from '@chatto/chat-ui';
import type { ChatEvent } from '@chatto/core';
import { describe, expect, it } from 'vitest';
import { ControlLog, emptyControlLogView, eventsAfter, reduceControlLogView } from './controlLog';

const message = (): ChatEvent => createMockMessage();

describe('ControlLog', () => {
  it('numbers events and keeps them in the chat log', () => {
    const log = new ControlLog();
    const first = log.receive(message(), 1000);
    const second = log.receive(message(), 2000);
    expect([first.seq, second.seq]).toEqual([1, 2]);
    const snapshot = log.snapshot();
    expect(snapshot.seq).toBe(2);
    expect(snapshot.chatLog.entries).toHaveLength(2);
    expect(snapshot.chatLog.totalMessages).toBe(2);
  });

  it('collects redemptions and forgets dismissed ones', () => {
    const log = new ControlLog();
    const notice = mockNotice({ eventType: 'redemption', kind: 'other', systemText: '', meta: { reward: 'Hydrate' } });
    log.receive({ type: 'notice', notice }, 1000);
    const key = log.snapshot().redemptions.entries[0]?.key;
    expect(key).toBeDefined();
    log.dismissRedemption(key!);
    expect(log.snapshot().redemptions.entries).toHaveLength(0);
  });

  it('clears the chat log but keeps the session stats', () => {
    const log = new ControlLog();
    log.receive(message(), 1000);
    log.clearChat();
    expect(log.snapshot().chatLog.entries).toHaveLength(0);
    expect(log.snapshot().chatLog.totalMessages).toBe(1);
  });
});

describe('eventsAfter', () => {
  it('drops events the snapshot already has', () => {
    const log = new ControlLog();
    const early = log.receive(message(), 1000);
    const snapshot = log.snapshot();
    const late = log.receive(message(), 2000);
    expect(eventsAfter(snapshot, [early, late])).toEqual([late]);
  });
});

describe('reduceControlLogView', () => {
  it('holds events until the snapshot, then applies only the newer ones', () => {
    const log = new ControlLog();
    const early = log.receive(message(), 1000);
    const snapshot = log.snapshot();
    const late = log.receive(message(), 2000);

    let view = reduceControlLogView(emptyControlLogView, { type: 'event', item: early });
    view = reduceControlLogView(view, { type: 'event', item: late });
    expect(view.chatLog.entries).toHaveLength(0);

    view = reduceControlLogView(view, { type: 'load', snapshot });
    expect(view.chatLog.entries).toHaveLength(2);
    expect(view.chatLog.totalMessages).toBe(2);
    expect(view.seq).toBe(2);
  });

  it('ignores an event it already has', () => {
    const log = new ControlLog();
    const item = log.receive(message(), 1000);
    let view = reduceControlLogView(emptyControlLogView, { type: 'load', snapshot: log.snapshot() });
    view = reduceControlLogView(view, { type: 'event', item });
    expect(view.chatLog.entries).toHaveLength(1);
  });

  it('matches the main process after clear and dismiss', () => {
    const log = new ControlLog();
    const notice = mockNotice({ eventType: 'redemption', kind: 'other', systemText: '', meta: { reward: 'Tea' } });
    let view = reduceControlLogView(emptyControlLogView, { type: 'load', snapshot: log.snapshot() });
    for (const event of [message(), { type: 'notice', notice } as ChatEvent]) {
      view = reduceControlLogView(view, { type: 'event', item: log.receive(event, 1000) });
    }
    const key = view.redemptions.entries[0]!.key;
    view = reduceControlLogView(view, { type: 'clear-chat' });
    view = reduceControlLogView(view, { type: 'dismiss-redemption', key });
    log.clearChat();
    log.dismissRedemption(key);
    expect({ chatLog: view.chatLog, redemptions: view.redemptions }).toEqual({
      chatLog: log.snapshot().chatLog,
      redemptions: log.snapshot().redemptions,
    });
  });
});
