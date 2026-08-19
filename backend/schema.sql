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

-- When this learner started the course, and when they want to finish. Null
-- until they choose: the course used to have one hard-coded start date, which
-- only worked while there was exactly one learner.
ALTER TABLE users ADD COLUMN IF NOT EXISTS course_start DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS course_target_end DATE;

-- Which weeks of the course this learner has finished. Lived in the browser
-- first, which meant it was invisible to the API, so nothing outside that one
-- browser could tell how the course was going.
ALTER TABLE users ADD COLUMN IF NOT EXISTS course_weeks_done INTEGER[] NOT NULL DEFAULT '{}';

-- One row per (user, midi note): how many times that note has been played.
-- Powers the weakness heatmap on the Progress page.
CREATE TABLE IF NOT EXISTS note_stats (
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    midi_note    SMALLINT NOT NULL,
    played_count INTEGER NOT NULL DEFAULT 0,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, midi_note)
);

-- Who may manage other accounts. Off for everyone by default: the first admin
-- arrives through ADMIN_EMAIL at start-up, and every later one is promoted by
-- an admin who is already there.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Playing in time: how often the bar had to stop and wait for a note, and how
-- many notes landed inside the window. Both stay zero for a run that was not
-- played in time, which is honest rather than missing: nothing was keeping
-- time, so nobody waited.
ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS stalls        INTEGER NOT NULL DEFAULT 0;
ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS on_time_notes INTEGER NOT NULL DEFAULT 0;
