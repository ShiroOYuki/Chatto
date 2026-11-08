import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

/** Each log file stays under this size; older ones are kept as `chatto.1.log`, `chatto.2.log`. */
export const LOG_MAX_BYTES = 1024 * 1024;
export const LOG_FILE_COUNT = 3;

export type LogLevel = 'info' | 'warn' | 'error';

/** One value as log text: errors with their stack, everything else as compact JSON. */
export function formatLogDetail(value: unknown): string {
  if (value instanceof Error) return value.stack ?? `${value.name}: ${value.message}`;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

export function formatLogLine(at: Date, level: LogLevel, scope: string, message: string, details: unknown[]): string {
  const extra = details.map(formatLogDetail).join(' ');
  return `${at.toISOString()} ${level.toUpperCase().padEnd(5)} [${scope}] ${message}${extra ? ` ${extra}` : ''}\n`;
}

/**
 * The main process log (#56): warnings, errors and the key events (start,
 * local server, chat connection, updates, OBS plugin). It never records
 * tokens or chat content, and the channel name only lives in settings, so
 * diagnostics can leave it out. Writing never throws.
 */
export class Logger {
  constructor(
    readonly dir: string,
    private readonly options: { maxBytes?: number; files?: number; now?: () => Date } = {},
  ) {}

  /** The current file first, then older ones. */
  files(): string[] {
    const count = this.options.files ?? LOG_FILE_COUNT;
    return Array.from({ length: count }, (_, index) => this.#file(index)).filter((path) => existsSync(path));
  }

  /** The log files' text, newest file first. */
  read(): { name: string; text: string }[] {
    return this.files().map((path, index) => ({
      name: index === 0 ? 'chatto.log' : `chatto.${index}.log`,
      text: readFileSync(path, 'utf8'),
    }));
  }

  info(scope: string, message: string, ...details: unknown[]): void {
    this.write('info', scope, message, details);
  }

  warn(scope: string, message: string, ...details: unknown[]): void {
    this.write('warn', scope, message, details);
  }

  error(scope: string, message: string, ...details: unknown[]): void {
    this.write('error', scope, message, details);
  }

  write(level: LogLevel, scope: string, message: string, details: unknown[] = []): void {
    try {
      const line = formatLogLine(this.options.now?.() ?? new Date(), level, scope, message, details);
      mkdirSync(this.dir, { recursive: true });
      const current = this.#file(0);
      const size = existsSync(current) ? statSync(current).size : 0;
      if (size > 0 && size + Buffer.byteLength(line) > (this.options.maxBytes ?? LOG_MAX_BYTES)) this.#rotate();
      appendFileSync(current, line);
    } catch {
      // Logging must never break the app.
    }
  }

  /** Also writes the main process's `console.warn` and `console.error` (e.g. `[chatto] update failed`). */
  captureConsole(target: Pick<Console, 'warn' | 'error'> = console): void {
    for (const level of ['warn', 'error'] as const) {
      const original = target[level].bind(target);
      target[level] = (...args: unknown[]) => {
        original(...args);
        const [first, ...rest] = args;
        this.write(level, 'console', formatLogDetail(first), rest);
      };
    }
  }

  #file(index: number): string {
    return join(this.dir, index === 0 ? 'chatto.log' : `chatto.${index}.log`);
  }

  #rotate(): void {
    const count = this.options.files ?? LOG_FILE_COUNT;
    rmSync(this.#file(count - 1), { force: true });
    for (let index = count - 2; index >= 0; index -= 1) {
      if (existsSync(this.#file(index))) renameSync(this.#file(index), this.#file(index + 1));
    }
  }
}
