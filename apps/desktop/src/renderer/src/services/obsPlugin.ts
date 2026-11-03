import type { ObsPluginResult, ObsPluginStatus } from '../../../shared/ipc';
import { api } from '../api';

/** The bundled OBS plugin ("Chatto Chat" source). Each call reports the plugin's status after it. */
export const obsPlugin = {
  status: (): Promise<ObsPluginStatus> => api.getObsPluginStatus(),
  install: (): Promise<ObsPluginResult> => api.installObsPlugin(),
  uninstall: (): Promise<ObsPluginResult> => api.uninstallObsPlugin(),
};
