-- Sign-in identities of suspended accounts that were deleted, so they cannot come back as a new account.
CREATE TABLE banned_identities (
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  banned_at INTEGER NOT NULL,
  PRIMARY KEY (provider, provider_user_id)
);
