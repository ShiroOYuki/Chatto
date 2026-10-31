import { createSpecimenEvents, mockMessage, MOCK_USERS } from '@chatto/chat-ui';
import type { ChatEvent } from '@chatto/core';
import { test as base, expect, type Page } from '@playwright/test';
import type { AppState } from '../../apps/desktop/src/shared/ipc';

export const PANEL_URL = 'http://localhost:5175';
export const VIEWER_URL = 'http://localhost:5174';

/** A fixed moment, so timestamps in screenshots never change. */
export const FIXED_TIME = new Date('2026-11-01T20:30:00+08:00');

/** The control panel in browser mode with the deterministic mock API. */
export class Panel {
  constructor(readonly page: Page) {}

  async open(query = '') {
    await this.page.goto(`${PANEL_URL}/?e2e${query ? `&${query}` : ''}`);
    await this.page.waitForFunction(() => Boolean(window.__chattoMock));
    await expect(this.page.getByText('泡茶中…')).toHaveCount(0);
  }

  async emit(...events: ChatEvent[]) {
    await this.page.evaluate((list) => list.forEach((event) => window.__chattoMock!.emitChat(event)), events);
  }

  async setState(patch: Partial<AppState>) {
    await this.page.evaluate((next) => window.__chattoMock!.setState(next), patch);
  }

  /** Sidebar item; its name may end with a live count (e.g. 聊天室 12). */
  nav(label: string) {
    return this.page.getByRole('navigation').getByRole('button', { name: new RegExp(`^${label}`) });
  }
}

export const chatMessage = (text: string, user = MOCK_USERS[1]!): Extract<ChatEvent, { type: 'message' }> => ({
  type: 'message',
  message: mockMessage(user, [{ type: 'text', text }]),
});

export const specimen = createSpecimenEvents;

/** Blocks every request that leaves localhost, so pages render the same offline and on CI. */
export async function blockExternal(page: Page) {
  await page.route(/^https?:\/\/(?!localhost|127\.0\.0\.1)/, (route) => route.abort());
}

/** Replaces Math.random with a seeded generator so mock data is the same every run. */
export async function seedRandom(page: Page, seed = 42) {
  await page.addInitScript((initial) => {
    let state = initial;
    Math.random = () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }, seed);
}

export const test = base.extend<{ panel: Panel }>({
  panel: async ({ page }, use) => {
    await blockExternal(page);
    await seedRandom(page);
    await page.clock.setFixedTime(FIXED_TIME);
    await use(new Panel(page));
  },
});

export { expect };
