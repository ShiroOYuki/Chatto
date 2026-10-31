/**
 * In-memory stand-in for the browser `WebSocket`, installed with
 * `vi.stubGlobal('WebSocket', FakeWebSocket)`. Tests drive the "server" side
 * through `serverOpen`, `serverSend` and `serverClose`.
 */
export class FakeWebSocket extends EventTarget {
  static instances: FakeWebSocket[] = [];
  static reset(): void {
    FakeWebSocket.instances = [];
  }
  static latest(): FakeWebSocket {
    const socket = FakeWebSocket.instances.at(-1);
    if (!socket) throw new Error('no WebSocket was opened');
    return socket;
  }

  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  readyState = FakeWebSocket.CONNECTING;
  readonly sent: string[] = [];

  constructor(readonly url: string) {
    super();
    FakeWebSocket.instances.push(this);
  }

  send(data: string): void {
    if (this.readyState !== FakeWebSocket.OPEN) throw new Error('socket is not open');
    this.sent.push(data);
  }

  close(): void {
    if (this.readyState === FakeWebSocket.CLOSED) return;
    this.readyState = FakeWebSocket.CLOSED;
    this.dispatchEvent(new Event('close'));
  }

  serverOpen(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.dispatchEvent(new Event('open'));
  }

  serverSend(data: unknown): void {
    const message = new Event('message') as Event & { data: string };
    message.data = typeof data === 'string' ? data : JSON.stringify(data);
    this.dispatchEvent(message);
  }

  serverClose(): void {
    this.close();
  }

  get closed(): boolean {
    return this.readyState === FakeWebSocket.CLOSED;
  }
}
