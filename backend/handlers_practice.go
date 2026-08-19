package main

import (
	"encoding/json"
	"sort"
	"net/http"
	"strconv"
	"time"
)

type createSessionRequest struct {
	Source          string         `json:"source"`          // "monitor" | "exercise" | "warmup" | "song"
	Item            string         `json:"item"`            // which warm-up or song, empty for free playing
	DurationSeconds int            `json:"durationSeconds"` // how long the session lasted
	NotesPlayed     int            `json:"notesPlayed"`     // total note-on events
	CorrectNotes    int            `json:"correctNotes"`    // notes matching what was asked for
	WrongNotes      int            `json:"wrongNotes"`      // notes that did not
	NoteCounts      map[string]int `json:"noteCounts"`      // midiNote (as string key) -> count
}

// handleCreateSession records one practice session and rolls its per-note
// counts into note_stats. Both writes happen in a single transaction so the
// session and its stats never get out of sync.
func (s *server) handleCreateSession(w http.ResponseWriter, r *http.Request) {
	uid := userIDFrom(r.Context())

	var req createSessionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.Source == "" {
		req.Source = "monitor"
	}

	tx, err := s.db.Begin(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "db error")
		return
	}
	defer tx.Rollback(r.Context()) // no-op if we already committed

	var sessionID string
	err = tx.QueryRow(r.Context(),
		`INSERT INTO practice_sessions
		   (user_id, source, item, duration_seconds, notes_played, correct_notes, wrong_notes)
		 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
		uid, req.Source, req.Item, req.DurationSeconds, req.NotesPlayed, req.CorrectNotes, req.WrongNotes,
	).Scan(&sessionID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not save session")
		return
	}

	for noteStr, count := range req.NoteCounts {
		note, convErr := strconv.Atoi(noteStr)
		if convErr != nil || count <= 0 || note < 0 || note > 127 {
			continue
		}
		// Upsert: add to the running total for this note, or create the row.
		_, err = tx.Exec(r.Context(),
			`INSERT INTO note_stats (user_id, midi_note, played_count, updated_at)
			 VALUES ($1, $2, $3, now())
			 ON CONFLICT (user_id, midi_note)
			 DO UPDATE SET played_count = note_stats.played_count + EXCLUDED.played_count,
			               updated_at = now()`,
			uid, note, count,
		)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not update note stats")
			return
		}
	}

	if err := tx.Commit(r.Context()); err != nil {
		writeError(w, http.StatusInternalServerError, "could not commit")
		return
	}
	writeJSON(w, http.StatusCreated, map[string]string{"id": sessionID})
}

const dateLayout = "2006-01-02"

// How many weeks the course has. The material lives in the frontend; the API
// only needs the bound so it can reject nonsense week numbers.
const courseWeeks = 20

type courseRequest struct {
	StartDate string `json:"startDate"` // yyyy-mm-dd, empty to clear
	TargetEnd string `json:"targetEnd"` // yyyy-mm-dd, empty to clear
	WeeksDone []int  `json:"weeksDone"` // weeks ticked off, null to leave alone
}

// handleSetCourse stores when this learner started the course and when they
// want to finish. Both are per account: the plan is twenty weeks of material,
// and where those weeks land on the calendar is nobody else's business.
func (s *server) handleSetCourse(w http.ResponseWriter, r *http.Request) {
	uid := userIDFrom(r.Context())

	var req courseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}

	// Parsed rather than trusted: a bad date reaching the column would be
	// rejected by Postgres as a 500, which tells the caller nothing.
	var start, target *time.Time
	if req.StartDate != "" {
		parsed, err := time.Parse(dateLayout, req.StartDate)
		if err != nil {
			writeError(w, http.StatusBadRequest, "startDate must be yyyy-mm-dd")
			return
		}
		start = &parsed
	}
	if req.TargetEnd != "" {
		parsed, err := time.Parse(dateLayout, req.TargetEnd)
		if err != nil {
			writeError(w, http.StatusBadRequest, "targetEnd must be yyyy-mm-dd")
			return
		}
		target = &parsed
	}
	if start != nil && target != nil && !target.After(*start) {
		writeError(w, http.StatusBadRequest, "targetEnd must be after startDate")
		return
	}

	// Weeks are cleaned rather than trusted: a week number outside the course
	// would be stored happily and then confuse every reader of this row.
	weeks := req.WeeksDone
	if weeks != nil {
		seen := map[int]bool{}
		cleaned := []int{}
		for _, w := range weeks {
			if w < 1 || w > courseWeeks || seen[w] {
				continue
			}
			seen[w] = true
			cleaned = append(cleaned, w)
		}
		sort.Ints(cleaned)
		weeks = cleaned
	}

	_, err := s.db.Exec(r.Context(),
		`UPDATE users
		 SET course_start = $2,
		     course_target_end = $3,
		     course_weeks_done = COALESCE($4, course_weeks_done)
		 WHERE id = $1`,
		uid, start, target, weeks)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not save course dates")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

type sessionBrief struct {
	ID              string `json:"id"`
	Source          string `json:"source"`
	DurationSeconds int    `json:"durationSeconds"`
	NotesPlayed     int    `json:"notesPlayed"`
	StartedAt       string `json:"startedAt"`
}

// One warm-up or song, with how it has gone so far.
type itemStat struct {
	Item         string `json:"item"`
	Source       string `json:"source"`
	TimesPlayed  int    `json:"timesPlayed"`
	BestAccuracy int    `json:"bestAccuracy"` // percent, 0 when nothing was scored
	TotalSeconds int    `json:"totalSeconds"`
	LastPlayedAt string `json:"lastPlayedAt"`
}

type summaryResponse struct {
	TotalSessions  int            `json:"totalSessions"`
	TotalNotes     int            `json:"totalNotes"`
	TotalSeconds   int            `json:"totalSeconds"`
	NoteCounts     map[string]int `json:"noteCounts"`
	RecentSessions []sessionBrief `json:"recentSessions"`
	ItemStats      []itemStat     `json:"itemStats"`
}

// handleSummary returns everything the Progress page needs in one call:
// lifetime totals, per-note counts, and the last few sessions.
func (s *server) handleSummary(w http.ResponseWriter, r *http.Request) {
	uid := userIDFrom(r.Context())
	ctx := r.Context()

	resp := summaryResponse{
		NoteCounts:     map[string]int{},
		RecentSessions: []sessionBrief{},
		ItemStats:      []itemStat{},
	}

	err := s.db.QueryRow(ctx,
		`SELECT COUNT(*), COALESCE(SUM(notes_played), 0), COALESCE(SUM(duration_seconds), 0)
		 FROM practice_sessions WHERE user_id = $1`, uid,
	).Scan(&resp.TotalSessions, &resp.TotalNotes, &resp.TotalSeconds)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "summary failed")
		return
	}

	rows, err := s.db.Query(ctx,
		`SELECT midi_note, played_count FROM note_stats WHERE user_id = $1`, uid)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "note stats failed")
		return
	}
	defer rows.Close()
	for rows.Next() {
		var note, count int
		if err := rows.Scan(&note, &count); err == nil {
			resp.NoteCounts[strconv.Itoa(note)] = count
		}
	}

	srows, err := s.db.Query(ctx,
		`SELECT id, source, duration_seconds, notes_played, started_at
		 FROM practice_sessions WHERE user_id = $1
		 ORDER BY started_at DESC LIMIT 10`, uid)
	if err == nil {
		defer srows.Close()
		for srows.Next() {
			var b sessionBrief
			var startedAt time.Time
			if err := srows.Scan(&b.ID, &b.Source, &b.DurationSeconds, &b.NotesPlayed, &startedAt); err == nil {
				b.StartedAt = startedAt.Format(time.RFC3339)
				resp.RecentSessions = append(resp.RecentSessions, b)
			}
		}
	}

	// Per warm-up and per song: how often, how well at best, and when last.
	// Accuracy is computed in SQL so "best" means the best single attempt
	// rather than the average, which is what a practice log should show.
	irows, err := s.db.Query(ctx,
		`SELECT item,
		        MIN(source),
		        COUNT(*),
		        COALESCE(MAX(CASE WHEN correct_notes + wrong_notes > 0
		                          THEN (correct_notes * 100) / (correct_notes + wrong_notes)
		                          ELSE 0 END), 0),
		        COALESCE(SUM(duration_seconds), 0),
		        MAX(started_at)
		 FROM practice_sessions
		 WHERE user_id = $1 AND item <> ''
		 GROUP BY item
		 ORDER BY MAX(started_at) DESC`, uid)
	if err == nil {
		defer irows.Close()
		for irows.Next() {
			var st itemStat
			var last time.Time
			if err := irows.Scan(&st.Item, &st.Source, &st.TimesPlayed, &st.BestAccuracy,
				&st.TotalSeconds, &last); err == nil {
				st.LastPlayedAt = last.Format(time.RFC3339)
				resp.ItemStats = append(resp.ItemStats, st)
			}
		}
	}

	writeJSON(w, http.StatusOK, resp)
}
