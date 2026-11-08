import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatLogDetail, formatLogLine, Logger } from './logger';

const dirs: string[] = [];
const tempDir = () => {
  const dir = mkdtempSync(join(tmpdir(), 'chatto-log-'));
  dirs.push(dir);
  return dir;
};
afterEach(() => dirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true })));

const at = new Date('2026-11-08T05:00:00.000Z');

describe('log lines', () => {
  it('has time, level, scope, message and details', () => {
    expect(formatLogLine(at, 'warn', 'server', 'port in use', [{ port: 4820 }])).toBe(
      '2026-11-08T05:00:00.000Z WARN  [server] port in use {"port":4820}\n',
    );
  });

  it('writes errors with their stack', () => {
    const error = new Error('offline');
    expect(formatLogDetail(error)).toContain('Error: offline');
  });
});

describe('Logger', () => {
  it('appends lines to chatto.log', () => {
    const logger = new Logger(join(tempDir(), 'logs'), { now: () => at });
    logger.info('app', 'started');
    logger.error('updater', 'failed', new Error('offline'));
    const [file] = logger.read();
    expect(file!.name).toBe('chatto.log');
    expect(file!.text.split('\n')[0]).toBe('2026-11-08T05:00:00.000Z INFO  [app] started');
    expect(file!.text).toContain('ERROR [updater] failed Error: offline');
  });

  it('rotates past the size limit and keeps a fixed number of files', () => {
    const logger = new Logger(tempDir(), { maxBytes: 200, files: 3, now: () => at });
    for (let i = 0; i < 40; i += 1) logger.info('test', `line ${i}`);
    const files = logger.read();
    expect(files.map((file) => file.name)).toEqual(['chatto.log', 'chatto.1.log', 'chatto.2.log']);
    expect(files.every((file) => Buffer.byteLength(file.text) <= 200)).toBe(true);
    expect(files[0]!.text).toContain('line 39');
  });

  it('copies console warnings and errors into the log', () => {
    const logger = new Logger(tempDir(), { now: () => at });
    const target = { warn: vi.fn(), error: vi.fn() };
    logger.captureConsole(target);
    target.error('[chatto] update failed', new Error('offline'));
    expect(logger.read()[0]!.text).toContain('ERROR [console] [chatto] update failed Error: offline');
  });

  it('never throws when the folder cannot be written', () => {
    const logger = new Logger('\0bad');
    expect(() => logger.info('app', 'started')).not.toThrow();
  });
});
