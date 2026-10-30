import {
  decodeServerFrame,
  encodeFrame,
  PROTOCOL_VERSION,
  type ChatEvent,
  type ChatTheme,
  type ViewerTarget,
} from '@chatto/core';

export interface ViewerConnectionHandlers {
  onHello(theme: ChatTheme, backlog: ChatEvent[]): void;
  onEvent(event: ChatEvent): void;
  onTheme(theme: ChatTheme): void;
  onStatus(connected: boolean): void;
}

/**
 * Connects to the desktop app's local WebSocket and keeps reconnecting, so an
 * OBS source survives the app restarting.
 */
export function connectToApp(url: string, target: ViewerTarget, handlers: ViewerConnectionHandlers): () => void {
  let socket: WebSocket | null = null;
  let retry: ReturnType<typeof setTimeout> | null = null;
  let attempt = 0;
  let stopped = false;

  const open = () => {
    socket = new WebSocket(url);
    socket.addEventListener('open', () => {
      attempt = 0;
      handlers.onStatus(true);
      socket?.send(encodeFrame({ v: PROTOCOL_VERSION, type: 'subscribe', target }));
    });
    socket.addEventListener('message', (message) => {
      const frame = decodeServerFrame(String(message.data));
      if (!frame) return;
      if (frame.type === 'hello') handlers.onHello(frame.theme, frame.backlog);
      else if (frame.type === 'event') handlers.onEvent(frame.event);
      else handlers.onTheme(frame.theme);
    });
    socket.addEventListener('close', () => {
      handlers.onStatus(false);
      if (stopped) return;
      attempt += 1;
      retry = setTimeout(open, Math.min(10_000, 500 * 2 ** attempt));
    });
    socket.addEventListener('error', () => socket?.close());
  };

  open();
  return () => {
    stopped = true;
    if (retry) clearTimeout(retry);
    socket?.close();
  };
}
