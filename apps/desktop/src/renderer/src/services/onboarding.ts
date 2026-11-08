import { DEFAULT_THEME_ID } from '@chatto/chat-ui/themes';
import { VIEWER_TARGETS } from '@chatto/core';
import type { AppState } from '../../../shared/ipc';
import { appPrefs } from './app';

export type OnboardingStep = 'signIn' | 'connect' | 'theme' | 'alerts';

export interface OnboardingItem {
  step: OnboardingStep;
  done: boolean;
  /** Not needed to finish the list. */
  optional: boolean;
  /** Where its button goes. */
  page: 'accounts' | 'themes' | 'alerts';
}

/**
 * The overview's getting-started list (#54), worked out from state: each item ticks itself
 * once it is done. Only closing the list and visiting the pages are saved (in prefs).
 */
export function onboardingItems(state: AppState): OnboardingItem[] {
  const { auth, channel, prefs, selectedThemes } = state;
  const themeChosen = VIEWER_TARGETS.some((target) => selectedThemes[target] !== DEFAULT_THEME_ID);
  return [
    { step: 'signIn', done: auth.status === 'signed-in', optional: false, page: 'accounts' },
    // A saved channel counts: it connected before, even if it is reconnecting right now.
    {
      step: 'connect',
      done: channel.state === 'connected' || Boolean(channel.login),
      optional: false,
      page: 'accounts',
    },
    { step: 'theme', done: prefs.visitedThemes || themeChosen, optional: false, page: 'themes' },
    { step: 'alerts', done: prefs.visitedAlerts, optional: true, page: 'alerts' },
  ];
}

/** Every required item is done. */
export const onboardingComplete = (items: OnboardingItem[]) => items.every((item) => item.optional || item.done);

export const onboarding = {
  dismiss: () => appPrefs.set({ onboardingDismissed: true }),
  /** Remembers a visit to a page the list asks for; nothing is saved once the list is closed. */
  visited: (state: AppState, page: string) => {
    const { prefs } = state;
    if (prefs.onboardingDismissed) return;
    if (page === 'themes' && !prefs.visitedThemes) appPrefs.set({ visitedThemes: true });
    if (page === 'alerts' && !prefs.visitedAlerts) appPrefs.set({ visitedAlerts: true });
  },
};
