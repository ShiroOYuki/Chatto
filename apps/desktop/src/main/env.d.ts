interface ImportMetaEnv {
  /** Optional default Twitch Client ID, read from apps/desktop/.env at build time. */
  readonly MAIN_VITE_TWITCH_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
