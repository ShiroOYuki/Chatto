-- Official accounts (GitHub #23): Chatto's own account, shown with an "official" badge on its themes.
-- Independent of `role`; set by hand with SQL, like moderators.
ALTER TABLE accounts ADD COLUMN official INTEGER NOT NULL DEFAULT 0;
