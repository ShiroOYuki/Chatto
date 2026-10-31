/**
 * Runs a main-process action from an event handler without awaiting it.
 *
 * Actions whose failures matter to the user (sign-in, connect) already report them through
 * `AppState` (`auth.error`, `channel.detail`), so the UI shows the message from state; the
 * rejection itself only needs to be kept from going unhandled. It is logged, not dropped,
 * so failures of the other actions stay visible in DevTools.
 */
export function runAction(label: string, action: Promise<unknown>): void {
  action.catch((error: unknown) => console.error(`[chatto] ${label} failed`, error));
}
