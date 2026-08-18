-- Applied on every API start (idempotent). Postgres 13+ ships gen_random_uuid().

CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name  TEXT NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS practice_sessions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source           TEXT NOT NULL DEFAULT 'monitor',
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    notes_played     INTEGER NOT NULL DEFAULT 0,
    started_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user ON practice_sessions (user_id);

-- Added after the first release, so they arrive as ALTERs rather than in the
-- CREATE above: an existing database has already skipped that statement.
-- `item` is which warm-up or song was practised, empty for free playing.
ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS item          TEXT    NOT NULL DEFAULT '';
ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS correct_notes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS wrong_notes   INTEGER NOT NULL DEFAULT 0;

-- One row per (user, midi note): how many times that note has been played.
-- Powers the weakness heatmap on the Progress page.
CREATE TABLE IF NOT EXISTS note_stats (
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    midi_note    SMALLINT NOT NULL,
    played_count INTEGER NOT NULL DEFAULT 0,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, midi_note)
);
