import { createHash } from 'node:crypto';
import { cpSync, existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { ObsPluginResult, ObsPluginStatus } from '../shared/ipc';

/** Folder and DLL name of the plugin; OBS requires them to match. */
export const OBS_PLUGIN_NAME = 'obs-chatto';

export interface ObsPluginOptions {
  /** The plugin as Chatto ships it: `<bundledDir>/bin/64bit/obs-chatto.dll` and `<bundledDir>/data/…`. */
  bundledDir: string;
  /** OBS's shared plugin folder, `C:\ProgramData\obs-studio\plugins`. */
  pluginsDir: string;
  /** Folders that exist once OBS has been installed or run. */
  obsDirs: string[];
  isObsRunning(): Promise<boolean>;
}

/** Every file under `dir` as relative path → SHA-256, or null when the folder is missing. */
function fingerprint(dir: string): Map<string, string> | null {
  if (!existsSync(dir)) return null;
  const files = new Map<string, string>();
  const walk = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) walk(path);
      else files.set(relative(dir, path), createHash('sha256').update(readFileSync(path)).digest('hex'));
    }
  };
  walk(dir);
  return files;
}

function sameFiles(a: Map<string, string>, b: Map<string, string>): boolean {
  return a.size === b.size && [...a].every(([path, hash]) => b.get(path) === hash);
}

/**
 * Installs the bundled OBS plugin into OBS's shared plugin folder, where OBS
 * picks it up on its next start. "Outdated" means the installed files differ
 * from the ones this Chatto version ships, so no version bookkeeping is needed.
 */
export class ObsPlugin {
  constructor(private readonly options: ObsPluginOptions) {}

  get installDir(): string {
    return join(this.options.pluginsDir, OBS_PLUGIN_NAME);
  }

  status(): ObsPluginStatus {
    const obsFound = this.options.obsDirs.some((dir) => existsSync(dir));
    const bundled = fingerprint(this.options.bundledDir);
    if (!bundled || bundled.size === 0) return { state: 'unavailable', obsFound };
    const installed = fingerprint(this.installDir);
    if (!installed) return { state: 'not-installed', obsFound };
    return { state: sameFiles(bundled, installed) ? 'installed' : 'outdated', obsFound };
  }

  /** Copies the bundled plugin over any installed version. OBS holds the DLL open while it runs. */
  async install(): Promise<ObsPluginResult> {
    if (this.status().state === 'unavailable') return this.#fail('failed');
    if (await this.options.isObsRunning()) return this.#fail('obs-running');
    try {
      rmSync(this.installDir, { recursive: true, force: true });
      cpSync(this.options.bundledDir, this.installDir, { recursive: true });
    } catch {
      return this.#fail('failed');
    }
    return { ok: true, status: this.status() };
  }

  async uninstall(): Promise<ObsPluginResult> {
    if (await this.options.isObsRunning()) return this.#fail('obs-running');
    try {
      rmSync(this.installDir, { recursive: true, force: true });
    } catch {
      return this.#fail('failed');
    }
    return { ok: true, status: this.status() };
  }

  #fail(reason: 'obs-running' | 'failed'): ObsPluginResult {
    return { ok: false, reason, status: this.status() };
  }
}
