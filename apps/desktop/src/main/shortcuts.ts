import { SHORTCUT_ACTIONS, type ShortcutAction, type ShortcutBindings } from '../shared/shortcuts';

/** The part of Electron's `globalShortcut` used here, so tests can fake it. */
export interface ShortcutRegistry {
  /** False (or a throw, for an accelerator Electron cannot parse) when the keys cannot be taken. */
  register(accelerator: string, callback: () => void): boolean;
  unregister(accelerator: string): void;
}

/**
 * Keeps the system-wide shortcuts in step with the saved bindings (#53). They work while
 * the control panel is in the tray; main unregisters everything when Chatto quits.
 */
export class GlobalShortcuts {
  #active = new Map<ShortcutAction, string>();
  #failed = new Set<ShortcutAction>();

  constructor(
    private readonly registry: ShortcutRegistry,
    private readonly run: (action: ShortcutAction) => void,
  ) {}

  /** Saved bindings that another app holds right now; Settings points them out. */
  get failed(): ShortcutAction[] {
    return SHORTCUT_ACTIONS.filter((action) => this.#failed.has(action));
  }

  /** Registers every saved binding (at startup). */
  apply(bindings: ShortcutBindings): void {
    for (const action of SHORTCUT_ACTIONS) {
      if (!this.set(action, bindings[action])) this.#failed.add(action);
    }
  }

  /**
   * Binds `action` to `accelerator` (empty removes it). False when Windows refuses the keys:
   * the previous binding then stays in place.
   */
  set(action: ShortcutAction, accelerator: string): boolean {
    const previous = this.#active.get(action);
    if (previous === accelerator) return true;
    if (previous) this.registry.unregister(previous);
    this.#active.delete(action);
    if (!accelerator) {
      this.#failed.delete(action);
      return true;
    }
    if (this.#register(action, accelerator)) {
      this.#failed.delete(action);
      return true;
    }
    if (previous) this.#register(action, previous);
    return false;
  }

  unregisterAll(): void {
    for (const accelerator of this.#active.values()) this.registry.unregister(accelerator);
    this.#active.clear();
  }

  #register(action: ShortcutAction, accelerator: string): boolean {
    let ok = false;
    try {
      ok = this.registry.register(accelerator, () => this.run(action));
    } catch {
      ok = false;
    }
    if (ok) this.#active.set(action, accelerator);
    return ok;
  }
}
