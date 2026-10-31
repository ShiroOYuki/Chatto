import type { AppState } from '../../../shared/ipc';
import { api } from '../api';
import { runAction } from './run';

const DEV_CONSOLE_URL = 'https://dev.twitch.tv/console/apps';

export interface TwitchStatus {
  signedIn: boolean;
  connected: boolean;
  /** Connecting or reconnecting: the connect button is locked. */
  busy: boolean;
}

/** Flags derived from state, shared by the compact dashboard and the connections page. */
export function twitchStatus(state: AppState): TwitchStatus {
  const { channel, auth } = state;
  return {
    signedIn: auth.status === 'signed-in',
    connected: channel.state === 'connected',
    busy: channel.state === 'connecting' || channel.state === 'reconnecting',
  };
}

/** Twitch account and channel actions. Errors surface through `state.auth` and `state.channel`. */
export const twitch = {
  setClientId: (clientId: string) => runAction('setClientId', api.setClientId(clientId)),
  signIn: () => runAction('signIn', api.signIn()),
  cancelSignIn: () => runAction('cancelSignIn', api.cancelSignIn()),
  signOut: () => runAction('signOut', api.signOut()),
  connect: (login: string) => runAction('connect', api.connect(login)),
  disconnect: () => runAction('disconnect', api.disconnect()),
  openVerificationPage: (state: AppState) => {
    const uri = state.auth.deviceCode?.verificationUri;
    if (uri) runAction('openExternal', api.openExternal(uri));
  },
  openDevConsole: () => runAction('openExternal', api.openExternal(DEV_CONSOLE_URL)),
};
