import type { ChatEvent, ChatThemeOptions } from '@chatto/core';
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { emptyFeed, expireFeed, reduceFeed, type FeedState } from './feed';

type Action = { type: 'event'; event: ChatEvent } | { type: 'tick' } | { type: 'reset'; events: ChatEvent[] };

/**
 * Holds the visible chat feed for a theme. Returns a `push` function that
 * accepts normalized ChatEvents from any source (WebSocket, IPC, mock).
 */
export function useChatFeed(options: ChatThemeOptions) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [state, dispatch] = useReducer((current: FeedState, action: Action): FeedState => {
    const opts = optionsRef.current;
    switch (action.type) {
      case 'event':
        return reduceFeed(current, action.event, opts);
      case 'tick':
        return expireFeed(current, opts);
      case 'reset':
        return action.events.reduce((acc, event) => reduceFeed(acc, event, opts), emptyFeed);
    }
  }, emptyFeed);

  useEffect(() => {
    if (options.messageLifetime <= 0) return;
    const timer = setInterval(() => dispatch({ type: 'tick' }), 500);
    return () => clearInterval(timer);
  }, [options.messageLifetime]);

  const push = useCallback((event: ChatEvent) => dispatch({ type: 'event', event }), []);
  const reset = useCallback((events: ChatEvent[]) => dispatch({ type: 'reset', events }), []);

  return { items: state.items, push, reset };
}
