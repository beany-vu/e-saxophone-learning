package main

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

// These tests talk to a real Postgres, because the logic worth testing here is
// the transaction and the upsert, and neither exists without a database.
// `docker compose run --rm api-test` provides one.

func testDB(t *testing.T) *pgxpool.Pool {
	t.Helper()
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		t.Skip("DATABASE_URL not set, skipping database tests")
	}
	pool, err := connectWithRetry(context.Background(), url, 10)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	if err := migrate(context.Background(), pool); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	t.Cleanup(pool.Close)
	return pool
}

// A throwaway user, removed with everything it owns when the test ends.
func testUser(t *testing.T, pool *pgxpool.Pool) string {
	t.Helper()
	var id string
	err := pool.QueryRow(context.Background(),
		`INSERT INTO users (email, password_hash) VALUES ($1, 'x') RETURNING id`,
		"test-"+randomEmailPart(t)+"@example.com",
	).Scan(&id)
	if err != nil {
		t.Fatalf("create user: %v", err)
	}
	t.Cleanup(func() {
		pool.Exec(context.Background(), `DELETE FROM users WHERE id = $1`, id)
	})
	return id
}

func randomEmailPart(t *testing.T) string {
	t.Helper()
	var s string
	// gen_random_uuid is already available, and it avoids seeding anything here.
	if err := testPool.QueryRow(context.Background(), `SELECT gen_random_uuid()::text`).Scan(&s); err != nil {
		t.Fatalf("uuid: %v", err)
	}
	return s
}

var testPool *pgxpool.Pool

func postSession(t *testing.T, s *server, uid string, body createSessionRequest) *httptest.ResponseRecorder {
	t.Helper()
	raw, _ := json.Marshal(body)
	req := httptest.NewRequest("POST", "/api/practice/sessions", bytes.NewReader(raw))
	req = req.WithContext(context.WithValue(req.Context(), userIDKey, uid))
	rec := httptest.NewRecorder()
	s.handleCreateSession(rec, req)
	return rec
}

func getSummary(t *testing.T, s *server, uid string) summaryResponse {
	t.Helper()
	req := httptest.NewRequest("GET", "/api/practice/summary", nil)
	req = req.WithContext(context.WithValue(req.Context(), userIDKey, uid))
	rec := httptest.NewRecorder()
	s.handleSummary(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("summary status = %d, want 200: %s", rec.Code, rec.Body.String())
	}
	var out summaryResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("summary is not JSON: %v", err)
	}
	return out
}

func TestPracticeSessions(t *testing.T) {
	pool := testDB(t)
	testPool = pool
	s := &server{db: pool, jwtSecret: []byte("test"), corsOrigin: "http://localhost:3000"}

	t.Run("saves a session and rolls up its note counts", func(t *testing.T) {
		uid := testUser(t, pool)
		rec := postSession(t, s, uid, createSessionRequest{
			Source:          "exercise",
			DurationSeconds: 90,
			NotesPlayed:     14,
			NoteCounts:      map[string]int{"72": 8, "74": 6},
		})
		if rec.Code != http.StatusCreated {
			t.Fatalf("status = %d, want 201: %s", rec.Code, rec.Body.String())
		}

		sum := getSummary(t, s, uid)
		if sum.TotalSessions != 1 || sum.TotalNotes != 14 || sum.TotalSeconds != 90 {
			t.Errorf("totals = %d sessions, %d notes, %d seconds", sum.TotalSessions, sum.TotalNotes, sum.TotalSeconds)
		}
		if sum.NoteCounts["72"] != 8 || sum.NoteCounts["74"] != 6 {
			t.Errorf("note counts = %v", sum.NoteCounts)
		}
	})

	t.Run("adds to the running per-note total rather than replacing it", func(t *testing.T) {
		uid := testUser(t, pool)
		postSession(t, s, uid, createSessionRequest{NotesPlayed: 3, NoteCounts: map[string]int{"72": 3}})
		postSession(t, s, uid, createSessionRequest{NotesPlayed: 5, NoteCounts: map[string]int{"72": 5}})

		sum := getSummary(t, s, uid)
		if sum.NoteCounts["72"] != 8 {
			t.Errorf("note 72 count = %d, want 8 (3 then 5)", sum.NoteCounts["72"])
		}
	})

	t.Run("ignores note keys that are not playable MIDI notes", func(t *testing.T) {
		uid := testUser(t, pool)
		postSession(t, s, uid, createSessionRequest{
			NotesPlayed: 1,
			NoteCounts:  map[string]int{"72": 1, "999": 4, "-3": 2, "abc": 5, "60": 0},
		})
		sum := getSummary(t, s, uid)
		if len(sum.NoteCounts) != 1 || sum.NoteCounts["72"] != 1 {
			t.Errorf("note counts = %v, want only note 72", sum.NoteCounts)
		}
	})

	t.Run("tracks each practice item separately, keeping the best accuracy", func(t *testing.T) {
		uid := testUser(t, pool)
		postSession(t, s, uid, createSessionRequest{
			Source: "song", Item: "twinkle", DurationSeconds: 60,
			NotesPlayed: 14, CorrectNotes: 10, WrongNotes: 10, // 50%
		})
		postSession(t, s, uid, createSessionRequest{
			Source: "song", Item: "twinkle", DurationSeconds: 50,
			NotesPlayed: 14, CorrectNotes: 18, WrongNotes: 2, // 90%
		})
		postSession(t, s, uid, createSessionRequest{
			Source: "warmup", Item: "long-tones", DurationSeconds: 120,
			NotesPlayed: 5, CorrectNotes: 5, WrongNotes: 0, // 100%
		})

		sum := getSummary(t, s, uid)
		byItem := map[string]itemStat{}
		for _, st := range sum.ItemStats {
			byItem[st.Item] = st
		}
		twinkle, ok := byItem["twinkle"]
		if !ok {
			t.Fatalf("twinkle missing from %v", sum.ItemStats)
		}
		if twinkle.TimesPlayed != 2 {
			t.Errorf("twinkle times played = %d, want 2", twinkle.TimesPlayed)
		}
		if twinkle.BestAccuracy != 90 {
			t.Errorf("twinkle best accuracy = %d, want 90", twinkle.BestAccuracy)
		}
		if twinkle.Source != "song" {
			t.Errorf("twinkle source = %q, want song", twinkle.Source)
		}
		if twinkle.LastPlayedAt == "" {
			t.Error("twinkle has no last played time")
		}
		if byItem["long-tones"].BestAccuracy != 100 {
			t.Errorf("long tones best accuracy = %d, want 100", byItem["long-tones"].BestAccuracy)
		}
	})

	t.Run("a session with no item does not appear in the per-item list", func(t *testing.T) {
		uid := testUser(t, pool)
		postSession(t, s, uid, createSessionRequest{Source: "monitor", NotesPlayed: 4})
		sum := getSummary(t, s, uid)
		if len(sum.ItemStats) != 0 {
			t.Errorf("item stats = %v, want empty", sum.ItemStats)
		}
	})

	t.Run("one user never sees another user's practice", func(t *testing.T) {
		mine := testUser(t, pool)
		theirs := testUser(t, pool)
		postSession(t, s, theirs, createSessionRequest{
			Source: "song", Item: "twinkle", NotesPlayed: 9, CorrectNotes: 9,
			NoteCounts: map[string]int{"72": 9},
		})
		sum := getSummary(t, s, mine)
		if sum.TotalSessions != 0 || len(sum.NoteCounts) != 0 || len(sum.ItemStats) != 0 {
			t.Errorf("leaked another user's data: %+v", sum)
		}
	})
}
