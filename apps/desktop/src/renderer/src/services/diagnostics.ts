import type { DiagnosticsOptions } from '../../../shared/ipc';
import { api } from '../api';
import { runAction } from './run';

/** Diagnostics export (#56). `export` resolves to false when the user cancels the save dialog. */
export const diagnostics = {
  export: (options: DiagnosticsOptions): Promise<boolean> => api.exportDiagnostics(options),
  reveal: () => runAction('revealDiagnostics', api.revealDiagnostics()),
};
