-- Theme sharing (GitHub #4). Times are Unix milliseconds; days are whole UTC days since 1970.

-- A Chatto account only ties sign-in identities together: no email, no password.
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', -- 'member' | 'moderator'
  banned INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  publish_day INTEGER NOT NULL DEFAULT 0,
  publish_count INTEGER NOT NULL DEFAULT 0
);

-- One row per linked sign-in method, keyed by the user id the platform reports.
CREATE TABLE identities (
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  PRIMARY KEY (provider, provider_user_id)
);
CREATE INDEX identities_account ON identities(account_id);

-- Session tokens are stored as SHA-256 hashes only.
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  used_at INTEGER NOT NULL
);
CREATE INDEX sessions_account ON sessions(account_id);

-- A sign-in in progress, keyed by the `state` the browser carries. When the browser comes back
-- from the platform, the platform user and a one-time `code` (stored hashed) are filled in; the app
-- that started the sign-in trades the code plus its PKCE verifier for a session, and the row goes.
CREATE TABLE sign_ins (
  state TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  link_to TEXT,
  port INTEGER NOT NULL,
  challenge TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  code_hash TEXT UNIQUE,
  user_id TEXT,
  user_name TEXT
);

CREATE TABLE themes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT NOT NULL,       -- JSON array, chosen by the author
  auto_tags TEXT NOT NULL,  -- JSON array, derived from the theme
  search TEXT NOT NULL,     -- lowercase name, description and tags, for search
  author_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  remix_of TEXT,
  version INTEGER NOT NULL,
  schema_version INTEGER NOT NULL,
  published_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  thumbnail TEXT,           -- file name under thumbnails/ in R2
  likes INTEGER NOT NULL DEFAULT 0,
  downloads INTEGER NOT NULL DEFAULT 0,
  reports INTEGER NOT NULL DEFAULT 0,
  cleared_reports INTEGER NOT NULL DEFAULT 0,
  hidden_by_moderator INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX themes_category ON themes(category);
CREATE INDEX themes_author ON themes(author_id);
CREATE INDEX themes_published ON themes(published_at);

-- Frame images the current version of each theme uses, so unused uploads can be removed.
CREATE TABLE theme_assets (
  theme_id TEXT NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  file TEXT NOT NULL,
  PRIMARY KEY (theme_id, file)
);
CREATE INDEX theme_assets_file ON theme_assets(file);

CREATE TABLE likes (
  theme_id TEXT NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  PRIMARY KEY (theme_id, account_id)
);
CREATE INDEX likes_account ON likes(account_id);

CREATE TABLE reports (
  theme_id TEXT NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (theme_id, account_id)
);
CREATE INDEX reports_account ON reports(account_id);

-- Downloads already counted today, by hashed anonymous client id; cleared every day.
CREATE TABLE download_marks (
  theme_id TEXT NOT NULL,
  client_hash TEXT NOT NULL,
  day INTEGER NOT NULL,
  PRIMARY KEY (theme_id, client_hash, day)
);

-- Request counters by hashed address or account per minute; cleared after a few minutes.
CREATE TABLE rate_limits (
  key TEXT NOT NULL,
  minute INTEGER NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (key, minute)
);

-- Sign-in identities of suspended accounts that were deleted, so they cannot come back as a new account.
CREATE TABLE banned_identities (
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  banned_at INTEGER NOT NULL,
  PRIMARY KEY (provider, provider_user_id)
);
