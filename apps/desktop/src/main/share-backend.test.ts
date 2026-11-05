import { SHARE_API_URL } from '@chatto/share';
import { describe, expect, it } from 'vitest';
import { canOpenSignInPage, pickShareService } from './share-backend';

describe('pickShareService', () => {
  it('uses the real service in packaged builds and the fake in development', () => {
    expect(pickShareService({ isDev: false })).toEqual({ kind: 'http', url: SHARE_API_URL });
    expect(pickShareService({ isDev: true })).toEqual({ kind: 'fake' });
  });

  it('follows an override, the run-time one first', () => {
    expect(pickShareService({ build: 'http://localhost:8787', isDev: true })).toEqual({
      kind: 'http',
      url: 'http://localhost:8787',
    });
    expect(pickShareService({ runtime: 'fake', build: 'https://api.chattolive.com', isDev: false })).toEqual({
      kind: 'fake',
    });
    expect(pickShareService({ build: ' fake ', isDev: false })).toEqual({ kind: 'fake' });
    // Anything else is ignored.
    expect(pickShareService({ build: 'nonsense', isDev: false })).toEqual({ kind: 'http', url: SHARE_API_URL });
  });
});

describe('canOpenSignInPage', () => {
  it('opens https pages, and a local service only in development', () => {
    expect(canOpenSignInPage('https://api.chattolive.com/v1/auth/start/x', false)).toBe(true);
    expect(canOpenSignInPage('http://localhost:8787/v1/auth/start/x', false)).toBe(false);
    expect(canOpenSignInPage('http://localhost:8787/v1/auth/start/x', true)).toBe(true);
    expect(canOpenSignInPage('http://example.com/', true)).toBe(false);
  });
});
