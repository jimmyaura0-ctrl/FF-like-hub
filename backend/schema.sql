
CREATE TABLE IF NOT EXISTS lookup_requests (
    id TEXT PRIMARY KEY,
    uid TEXT NOT NULL,
    region TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lookup_uid_created
ON lookup_requests(uid, created_at DESC);

CREATE TABLE IF NOT EXISTS likes_snapshots (
    id TEXT PRIMARY KEY,
    uid TEXT NOT NULL,
    likes INTEGER NOT NULL CHECK(likes >= 0),
    source TEXT NOT NULL,
    recorded_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_snapshots_uid_date
ON likes_snapshots(uid, recorded_at DESC);
