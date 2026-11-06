import type { ChatEvent } from '@chatto/core';
import type { AppState, ChattoApi } from '../../apps/desktop/src/shared/ipc';

// Mirrors the globals declared in apps/desktop/src/renderer/src/api.ts.
declare global {
  interface Window {
    chatto?: ChattoApi;
    __chattoMock?: {
      emitChat(event: ChatEvent): void;
      setState(patch: Partial<AppState>): void;
      getState(): AppState;
    };
  }
}

export {};
