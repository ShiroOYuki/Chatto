import type { ChatEvent } from '@chatto/core';
import { useEffect, useState } from 'react';
import type { AppState } from '../../shared/ipc';
import { api } from './api';

export function useAppState(): AppState | null {
  const [state, setState] = useState<AppState | null>(null);
  useEffect(() => {
    void api.getState().then(setState);
    return api.onState(setState);
  }, []);
  return state;
}

/** Messages per minute over a sliding one-minute window. */
export function useMessageRate(): number {
  const [times, setTimes] = useState<number[]>([]);
  useEffect(() => {
    const off = api.onChatEvent((event: ChatEvent) => {
      if (event.type !== 'message') return;
      setTimes((prev) => [...prev.filter((t) => Date.now() - t < 60_000), Date.now()]);
    });
    const timer = setInterval(() => setTimes((prev) => prev.filter((t) => Date.now() - t < 60_000)), 5000);
    return () => {
      off();
      clearInterval(timer);
    };
  }, []);
  return times.length;
}
