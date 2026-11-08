import type { OverlayWindowId } from '../../../shared/ipc';
import type { OverlayLook } from '../../../shared/overlayLook';
import { api } from '../api';
import { runAction } from './run';

export const overlay = {
  setEnabled: (enabled: boolean) => runAction('setOverlayEnabled', api.setOverlayEnabled(enabled)),
  setEditing: (editing: boolean) => runAction('setOverlayEditing', api.setOverlayEditing(editing)),
  resetBounds: () => runAction('resetOverlayBounds', api.resetOverlayBounds()),
  /** Backdrop and chat opacity of a desktop window (the chat overlay or the alert overlay). */
  setLook: (window: OverlayWindowId, look: OverlayLook) =>
    runAction('setOverlayLook', api.setOverlayLook(window, look)),
  /** Holds new messages back from the overlays and OBS, or lets them through (#53). */
  setChatPaused: (paused: boolean) => runAction('setChatPaused', api.setChatPaused(paused)),
  /** Empties the chat on the overlays and OBS; the control panel's log stays. */
  clearChatOnScreen: () => runAction('clearChatOnScreen', api.clearChatOnScreen()),
};
