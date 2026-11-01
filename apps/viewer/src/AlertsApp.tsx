import {
  ChatView,
  EVENT_CATALOG,
  exitDurationMs,
  getPresetTheme,
  playSound,
  PRESET_THEMES,
  sampleEvent,
} from '@chatto/chat-ui';
import { defaultSound, type AlertCue, type ChatEvent, type ChatTheme } from '@chatto/core';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { emptyQueue, reduceAlerts } from './alertQueue';
import { connectToApp } from './connection';

const params = new URLSearchParams(location.search);
const isMock = params.has('mock');
const isSpecimen = params.has('specimen');
const fallbackTheme = getPresetTheme(params.get('theme') ?? 'bubble') ?? PRESET_THEMES[0]!;

/** User sounds are served by the desktop app next to this page. */
const soundUrl = (id: string) => `/sounds/${encodeURIComponent(id)}`;

/**
 * Event alert overlay (`/alerts`): platform events pop up one card at a time
 * on the streamer's desktop. The desktop app decides which events alert and
 * sends each with a cue (how long it stays, which sound it plays).
 * `?mock=1` cycles through sample events; `?specimen` shows one fixed card.
 */
export function AlertsApp() {
  const [theme, setTheme] = useState<ChatTheme>(fallbackTheme);
  const [state, dispatch] = useReducer(reduceAlerts, emptyQueue);
  const optionsRef = useRef(theme.options);
  optionsRef.current = theme.options;

  const receive = useCallback((event: ChatEvent, cue?: AlertCue) => {
    dispatch({ type: 'event', event, cue, options: optionsRef.current });
  }, []);

  useEffect(() => {
    if (isSpecimen) return receive(sampleEvent('twitch:raid'), { durationMs: Number.POSITIVE_INFINITY });
    if (isMock) return startMockAlerts(receive);
    const wsUrl = params.get('ws') ?? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
    return connectToApp(wsUrl, 'alerts', {
      onHello: (nextTheme) => setTheme(nextTheme),
      onEvent: receive,
      onTheme: setTheme,
      onStatus: () => undefined,
    });
  }, [receive]);

  const { current, phase } = state;

  // Each card plays its sound as it appears.
  useEffect(() => {
    if (current?.cue.sound) playSound(current.cue.sound, soundUrl).catch((error) => console.error(error));
  }, [current]);

  // Show → leave → next.
  useEffect(() => {
    if (!current) return;
    const wait = phase === 'show' ? current.cue.durationMs : exitDurationMs(theme);
    if (!Number.isFinite(wait)) return;
    const timer = setTimeout(() => dispatch({ type: phase === 'show' ? 'leave' : 'next' }), wait);
    return () => clearTimeout(timer);
  }, [current, phase, theme]);

  return <ChatView theme={theme} items={current ? [current.item] : []} leaving={phase === 'leave'} />;
}

/** Cycles through every catalogued event so the alert look can be judged in a browser. */
function startMockAlerts(receive: (event: ChatEvent, cue?: AlertCue) => void): () => void {
  const keys = EVENT_CATALOG.flatMap((group) => group.events.map((event) => event.key));
  let index = 0;
  const next = () => {
    const key = keys[index++ % keys.length]!;
    receive(sampleEvent(key), { durationMs: 2500, sound: defaultSound('bell') });
  };
  next();
  const timer = setInterval(next, 3500);
  return () => clearInterval(timer);
}
