import { api } from '../api';
import { runAction } from './run';

export const overlay = {
  setEnabled: (enabled: boolean) => runAction('setOverlayEnabled', api.setOverlayEnabled(enabled)),
  setEditing: (editing: boolean) => runAction('setOverlayEditing', api.setOverlayEditing(editing)),
  resetBounds: () => runAction('resetOverlayBounds', api.resetOverlayBounds()),
};
