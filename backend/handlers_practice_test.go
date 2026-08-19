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

func TestCourseDates(t *testing.T) {
	pool := testDB(t)
	testPool = pool
	s := &server{db: pool, jwtSecret: []byte("test"), corsOrigin: "http://localhost:3000"}

	setDates := func(t *testing.T, uid, start, end string) *httptest.ResponseRecorder {
		t.Helper()
		raw, _ := json.Marshal(courseRequest{StartDate: start, TargetEnd: end})
		req := httptest.NewRequest("PUT", "/api/practice/course", bytes.NewReader(raw))
		req = req.WithContext(context.WithValue(req.Context(), userIDKey, uid))
		rec := httptest.NewRecorder()
		s.handleSetCourse(rec, req)
		return rec
	}

	me := func(t *testing.T, uid string) userResponse {
		t.Helper()
		req := httptest.NewRequest("GET", "/api/auth/me", nil)
		req = req.WithContext(context.WithValue(req.Context(), userIDKey, uid))
		rec := httptest.NewRecorder()
		s.handleMe(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("me status = %d: %s", rec.Code, rec.Body.String())
		}
		var out userResponse
		if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
			t.Fatalf("me is not JSON: %v", err)
		}
		return out
	}

	t.Run("a new account has no course dates until it picks some", func(t *testing.T) {
		uid := testUser(t, pool)
		got := me(t, uid)
		if got.CourseStart != "" || got.TargetEnd != "" {
			t.Errorf("new user already has dates: %+v", got)
		}
	})

	t.Run("saves the dates and reads them back", func(t *testing.T) {
		uid := testUser(t, pool)
		if rec := setDates(t, uid, "2027-01-04", "2027-05-24"); rec.Code != http.StatusOK {
			t.Fatalf("status = %d: %s", rec.Code, rec.Body.String())
		}
		got := me(t, uid)
		if got.CourseStart != "2027-01-04" || got.TargetEnd != "2027-05-24" {
			t.Errorf("dates = %q and %q", got.CourseStart, got.TargetEnd)
		}
	})

	t.Run("two learners keep their own dates", func(t *testing.T) {
		first := testUser(t, pool)
		second := testUser(t, pool)
		setDates(t, first, "2026-08-19", "2027-01-05")
		setDates(t, second, "2027-03-01", "2027-07-19")

		if got := me(t, first).CourseStart; got != "2026-08-19" {
			t.Errorf("first learner start = %q", got)
		}
		if got := me(t, second).CourseStart; got != "2027-03-01" {
			t.Errorf("second learner start = %q", got)
		}
	})

	t.Run("changing the start date later just moves it", func(t *testing.T) {
		uid := testUser(t, pool)
		setDates(t, uid, "2026-08-19", "2027-01-05")
		setDates(t, uid, "2026-09-07", "2027-01-25")
		if got := me(t, uid).CourseStart; got != "2026-09-07" {
			t.Errorf("start = %q, want the newer date", got)
		}
	})

	t.Run("refuses a date that is not a date", func(t *testing.T) {
		uid := testUser(t, pool)
		for _, bad := range []string{"tomorrow", "19-08-2026", "2026-13-45", "2026-08"} {
			if rec := setDates(t, uid, bad, ""); rec.Code != http.StatusBadRequest {
				t.Errorf("start %q gave status %d, want 400", bad, rec.Code)
			}
		}
	})

	t.Run("refuses a target that lands before the start", func(t *testing.T) {
		uid := testUser(t, pool)
		if rec := setDates(t, uid, "2026-08-19", "2026-08-01"); rec.Code != http.StatusBadRequest {
			t.Errorf("status = %d, want 400", rec.Code)
		}
	})

	t.Run("clears the dates when given empty ones", func(t *testing.T) {
		uid := testUser(t, pool)
		setDates(t, uid, "2026-08-19", "2027-01-05")
		if rec := setDates(t, uid, "", ""); rec.Code != http.StatusOK {
			t.Fatalf("status = %d", rec.Code)
		}
		if got := me(t, uid); got.CourseStart != "" || got.TargetEnd != "" {
			t.Errorf("dates not cleared: %+v", got)
		}
	})
}

func TestCourseWeeksDone(t *testing.T) {
	pool := testDB(t)
	testPool = pool
	s := &server{db: pool, jwtSecret: []byte("test"), corsOrigin: "http://localhost:3000"}

	put := func(t *testing.T, uid string, body courseRequest) *httptest.ResponseRecorder {
		t.Helper()
		raw, _ := json.Marshal(body)
		req := httptest.NewRequest("PUT", "/api/practice/course", bytes.NewReader(raw))
		req = req.WithContext(context.WithValue(req.Context(), userIDKey, uid))
		rec := httptest.NewRecorder()
		s.handleSetCourse(rec, req)
		return rec
	}

	read := func(t *testing.T, uid string) userResponse {
		t.Helper()
		req := httptest.NewRequest("GET", "/api/auth/me", nil)
		req = req.WithContext(context.WithValue(req.Context(), userIDKey, uid))
		rec := httptest.NewRecorder()
		s.handleMe(rec, req)
		var out userResponse
		json.Unmarshal(rec.Body.Bytes(), &out)
		return out
	}

	t.Run("a new account has finished nothing", func(t *testing.T) {
		uid := testUser(t, pool)
		if got := read(t, uid).WeeksDone; len(got) != 0 {
			t.Errorf("weeks done = %v, want empty", got)
		}
	})

	t.Run("stores the weeks that are ticked", func(t *testing.T) {
		uid := testUser(t, pool)
		put(t, uid, courseRequest{WeeksDone: []int{3, 1, 2}})
		if got := read(t, uid).WeeksDone; len(got) != 3 || got[0] != 1 || got[2] != 3 {
			t.Errorf("weeks done = %v, want 1 2 3 in order", got)
		}
	})

	t.Run("drops weeks that are not in the course", func(t *testing.T) {
		uid := testUser(t, pool)
		put(t, uid, courseRequest{WeeksDone: []int{0, 1, 21, -4, 20}})
		if got := read(t, uid).WeeksDone; len(got) != 2 || got[0] != 1 || got[1] != 20 {
			t.Errorf("weeks done = %v, want just 1 and 20", got)
		}
	})

	t.Run("drops duplicates", func(t *testing.T) {
		uid := testUser(t, pool)
		put(t, uid, courseRequest{WeeksDone: []int{2, 2, 2}})
		if got := read(t, uid).WeeksDone; len(got) != 1 {
			t.Errorf("weeks done = %v, want one entry", got)
		}
	})

	t.Run("leaves the weeks alone when the caller only changes dates", func(t *testing.T) {
		uid := testUser(t, pool)
		put(t, uid, courseRequest{WeeksDone: []int{1, 2}})
		put(t, uid, courseRequest{StartDate: "2026-09-07"})
		got := read(t, uid)
		if len(got.WeeksDone) != 2 {
			t.Errorf("weeks done = %v, want them untouched", got.WeeksDone)
		}
		if got.CourseStart != "2026-09-07" {
			t.Errorf("start = %q", got.CourseStart)
		}
	})

	t.Run("unticks by sending the shorter list", func(t *testing.T) {
		uid := testUser(t, pool)
		put(t, uid, courseRequest{WeeksDone: []int{1, 2, 3}})
		put(t, uid, courseRequest{WeeksDone: []int{1, 3}})
		if got := read(t, uid).WeeksDone; len(got) != 2 || got[1] != 3 {
			t.Errorf("weeks done = %v, want 1 and 3", got)
		}
	})

	t.Run("two learners keep their own weeks", func(t *testing.T) {
		first, second := testUser(t, pool), testUser(t, pool)
		put(t, first, courseRequest{WeeksDone: []int{1, 2, 3, 4}})
		put(t, second, courseRequest{WeeksDone: []int{1}})
		if len(read(t, first).WeeksDone) != 4 || len(read(t, second).WeeksDone) != 1 {
			t.Error("weeks leaked between accounts")
		}
	})
}
