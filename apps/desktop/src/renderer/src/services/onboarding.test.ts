import { describe, expect, it, vi } from 'vitest';
import { sampleState } from '../../../../../../tests/fake-api';
import { onboardingComplete, onboardingItems } from './onboarding';

vi.mock('../api', () => ({ api: {} }));

const fresh = () =>
  sampleState({
    prefs: { ...sampleState().prefs, onboardingDismissed: false },
    auth: { status: 'signed-out' },
    channel: { state: 'idle' },
    selectedThemes: { overlay: 'matcha-glass', embed: 'matcha-glass', alerts: 'matcha-glass' },
  });
const done = (state: ReturnType<typeof sampleState>) =>
  Object.fromEntries(onboardingItems(state).map((item) => [item.step, item.done]));

describe('onboardingItems', () => {
  it('starts with nothing done', () => {
    expect(done(fresh())).toEqual({ signIn: false, connect: false, theme: false, alerts: false });
    expect(onboardingComplete(onboardingItems(fresh()))).toBe(false);
  });

  it('ticks items from state and finishes without the optional one', () => {
    const state = {
      ...fresh(),
      auth: { status: 'signed-in' as const, login: 'ciel' },
      channel: { state: 'reconnecting' as const, login: 'ciel' },
      selectedThemes: { overlay: 'washi', embed: 'matcha-glass', alerts: 'matcha-glass' },
    };
    expect(done(state)).toEqual({ signIn: true, connect: true, theme: true, alerts: false });
    expect(onboardingComplete(onboardingItems(state))).toBe(true);
  });

  it('counts a visit to the themes or alerts page', () => {
    const state = fresh();
    state.prefs = { ...state.prefs, visitedThemes: true, visitedAlerts: true };
    expect(done(state)).toMatchObject({ theme: true, alerts: true });
  });
});
