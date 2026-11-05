interface ImportMetaEnv {
  /** Optional default Twitch Client ID, read from apps/desktop/.env at build time. */
  readonly MAIN_VITE_TWITCH_CLIENT_ID?: string;
  /** Theme sharing service (GitHub #4): a URL or `fake`. See `share-backend.ts`. */
  readonly MAIN_VITE_SHARE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
