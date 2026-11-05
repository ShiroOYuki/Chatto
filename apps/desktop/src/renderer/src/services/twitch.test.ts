import { describe, expect, it, vi } from 'vitest';
import type { AppState } from '../../../shared/ipc';
import { redemptionAccess } from './twitch';

vi.mock('../api', () => ({ api: {} }));

const state = (auth: AppState['auth'], channelLogin?: string) =>
  ({ auth, channel: { login: channelLogin, state: 'connected' } }) as AppState;

describe('redemptionAccess', () => {
  it('is ready for the broadcaster with the permission', () => {
    expect(redemptionAccess(state({ status: 'signed-in', login: 'Ciel', redemptionScope: true }, 'ciel'))).toBe(
      'ready',
    );
    // Before a channel is picked, the signed-in account is the channel.
    expect(redemptionAccess(state({ status: 'signed-in', login: 'ciel', redemptionScope: true }))).toBe('ready');
  });

  it('asks an older sign-in to sign in again', () => {
    expect(redemptionAccess(state({ status: 'signed-in', login: 'ciel' }, 'ciel'))).toBe('reauth');
  });

  it("explains that someone else's channel has no redemptions, whatever the permission", () => {
    expect(redemptionAccess(state({ status: 'signed-in', login: 'mod_bot', redemptionScope: true }, 'ciel'))).toBe(
      'not-broadcaster',
    );
    expect(redemptionAccess(state({ status: 'signed-in', login: 'mod_bot' }, 'ciel'))).toBe('not-broadcaster');
  });

  it('needs a sign-in first', () => {
    expect(redemptionAccess(state({ status: 'pending' }, 'ciel'))).toBe('signed-out');
  });
});
