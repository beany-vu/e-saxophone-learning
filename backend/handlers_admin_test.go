package main

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

// User management runs against a real Postgres for the same reason the
// practice tests do: the parts worth testing are the guards, and every guard
// asks the database a question.

// makeAdmin flips an existing throwaway user to admin.
func makeAdmin(t *testing.T, pool *pgxpool.Pool, uid string) {
	t.Helper()
	_, err := pool.Exec(context.Background(), `UPDATE users SET is_admin = true WHERE id = $1`, uid)
	if err != nil {
		t.Fatalf("make admin: %v", err)
	}
}

func isAdminInDB(t *testing.T, pool *pgxpool.Pool, uid string) bool {
	t.Helper()
	var admin bool
	err := pool.QueryRow(context.Background(), `SELECT is_admin FROM users WHERE id = $1`, uid).Scan(&admin)
	if err != nil {
		t.Fatalf("read is_admin: %v", err)
	}
	return admin
}

func userExists(t *testing.T, pool *pgxpool.Pool, uid string) bool {
	t.Helper()
	var n int
	err := pool.QueryRow(context.Background(), `SELECT count(*) FROM users WHERE id = $1`, uid).Scan(&n)
	if err != nil {
		t.Fatalf("count users: %v", err)
	}
	return n > 0
}

// call runs one admin request as the given user, with the path value the mux
// would have parsed out of the URL.
func call(t *testing.T, h http.HandlerFunc, method, target, actingAs, idParam string, body any) *httptest.ResponseRecorder {
	t.Helper()
	var r *http.Request
	if body != nil {
		raw, _ := json.Marshal(body)
		r = httptest.NewRequest(method, target, bytes.NewReader(raw))
	} else {
		r = httptest.NewRequest(method, target, nil)
	}
	if idParam != "" {
		r.SetPathValue("id", idParam)
	}
	r = r.WithContext(context.WithValue(r.Context(), userIDKey, actingAs))
	rec := httptest.NewRecorder()
	h(rec, r)
	return rec
}

func TestAdminGate(t *testing.T) {
	pool := testDB(t)
	testPool = pool
	s := &server{db: pool, jwtSecret: []byte("test"), corsOrigin: "http://localhost:3000"}

	// The handler the gate protects: it only runs if the gate let the request
	// through, which is exactly what these tests want to know.
	reached := false
	guarded := s.requireAdmin(func(w http.ResponseWriter, r *http.Request) {
		reached = true
		w.WriteHeader(http.StatusOK)
	})

	t.Run("an ordinary account is turned away", func(t *testing.T) {
		reached = false
		uid := testUser(t, pool)
		rec := call(t, guarded, "GET", "/api/admin/users", uid, "", nil)
		if rec.Code != http.StatusForbidden {
			t.Errorf("status = %d, want 403", rec.Code)
		}
		if reached {
			t.Error("the handler ran for a non-admin")
		}
	})

	t.Run("an admin is let through", func(t *testing.T) {
		reached = false
		uid := testUser(t, pool)
		makeAdmin(t, pool, uid)
		rec := call(t, guarded, "GET", "/api/admin/users", uid, "", nil)
		if rec.Code != http.StatusOK {
			t.Errorf("status = %d, want 200: %s", rec.Code, rec.Body.String())
		}
		if !reached {
			t.Error("the handler did not run for an admin")
		}
	})

	t.Run("a session for a deleted user is turned away, not crashed on", func(t *testing.T) {
		rec := call(t, guarded, "GET", "/api/admin/users", "00000000-0000-0000-0000-000000000000", "", nil)
		if rec.Code != http.StatusForbidden {
			t.Errorf("status = %d, want 403", rec.Code)
		}
	})
}

func TestAdminListsUsers(t *testing.T) {
	pool := testDB(t)
	testPool = pool
	s := &server{db: pool, jwtSecret: []byte("test"), corsOrigin: "http://localhost:3000"}

	admin := testUser(t, pool)
	makeAdmin(t, pool, admin)
	other := testUser(t, pool)
	postSession(t, s, other, createSessionRequest{
		DurationSeconds: 60, NotesPlayed: 10, CorrectNotes: 8, WrongNotes: 2,
	})

	rec := call(t, s.handleListUsers, "GET", "/api/admin/users", admin, "", nil)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200: %s", rec.Code, rec.Body.String())
	}
	var out struct {
		Users []adminUser `json:"users"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
		t.Fatalf("not JSON: %v", err)
	}

	byID := map[string]adminUser{}
	for _, u := range out.Users {
		byID[u.ID] = u
	}
	if !byID[admin].IsAdmin {
		t.Error("the admin is not listed as one")
	}
	if byID[other].IsAdmin {
		t.Error("an ordinary account is listed as an admin")
	}
	got := byID[other]
	if got.Sessions != 1 || got.NotesPlayed != 10 || got.CorrectNotes != 8 {
		t.Errorf("practice totals = %d sessions, %d notes, %d correct", got.Sessions, got.NotesPlayed, got.CorrectNotes)
	}
	if got.LastPracticedAt == "" {
		t.Error("no last-practised date for someone who has practised")
	}
	if got.CreatedAt == "" {
		t.Error("no created date")
	}
	// Password hashes have no business leaving the database.
	if bytes.Contains(rec.Body.Bytes(), []byte("password_hash")) || bytes.Contains(rec.Body.Bytes(), []byte("passwordHash")) {
		t.Error("the listing leaks password hashes")
	}
}

func TestAdminPromotesAndDemotes(t *testing.T) {
	pool := testDB(t)
	testPool = pool
	s := &server{db: pool, jwtSecret: []byte("test"), corsOrigin: "http://localhost:3000"}

	admin := testUser(t, pool)
	makeAdmin(t, pool, admin)

	t.Run("promotes another account", func(t *testing.T) {
		other := testUser(t, pool)
		rec := call(t, s.handleSetUserAdmin, "PATCH", "/api/admin/users/x", admin, other, map[string]bool{"isAdmin": true})
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200: %s", rec.Code, rec.Body.String())
		}
		if !isAdminInDB(t, pool, other) {
			t.Error("the account was not promoted")
		}
	})

	t.Run("demotes another admin", func(t *testing.T) {
		other := testUser(t, pool)
		makeAdmin(t, pool, other)
		rec := call(t, s.handleSetUserAdmin, "PATCH", "/api/admin/users/x", admin, other, map[string]bool{"isAdmin": false})
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200: %s", rec.Code, rec.Body.String())
		}
		if isAdminInDB(t, pool, other) {
			t.Error("the account was not demoted")
		}
	})

	// Locking yourself out is the one mistake with no way back through the UI.
	t.Run("refuses to demote yourself", func(t *testing.T) {
		rec := call(t, s.handleSetUserAdmin, "PATCH", "/api/admin/users/x", admin, admin, map[string]bool{"isAdmin": false})
		if rec.Code != http.StatusBadRequest {
			t.Errorf("status = %d, want 400", rec.Code)
		}
		if !isAdminInDB(t, pool, admin) {
			t.Error("the acting admin demoted themselves")
		}
	})

	t.Run("404s on an account that is not there", func(t *testing.T) {
		rec := call(t, s.handleSetUserAdmin, "PATCH", "/api/admin/users/x", admin,
			"00000000-0000-0000-0000-000000000000", map[string]bool{"isAdmin": true})
		if rec.Code != http.StatusNotFound {
			t.Errorf("status = %d, want 404", rec.Code)
		}
	})

	t.Run("rejects an id that is not a uuid, rather than 500ing", func(t *testing.T) {
		rec := call(t, s.handleSetUserAdmin, "PATCH", "/api/admin/users/x", admin, "not-a-uuid",
			map[string]bool{"isAdmin": true})
		if rec.Code != http.StatusNotFound && rec.Code != http.StatusBadRequest {
			t.Errorf("status = %d, want 400 or 404", rec.Code)
		}
	})
}

func TestAdminDeletesUsers(t *testing.T) {
	pool := testDB(t)
	testPool = pool
	s := &server{db: pool, jwtSecret: []byte("test"), corsOrigin: "http://localhost:3000"}

	admin := testUser(t, pool)
	makeAdmin(t, pool, admin)

	t.Run("deletes an account and everything it owns", func(t *testing.T) {
		other := testUser(t, pool)
		postSession(t, s, other, createSessionRequest{NotesPlayed: 4, NoteCounts: map[string]int{"72": 4}})

		rec := call(t, s.handleDeleteUser, "DELETE", "/api/admin/users/x", admin, other, nil)
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200: %s", rec.Code, rec.Body.String())
		}
		if userExists(t, pool, other) {
			t.Error("the account is still there")
		}
		var n int
		pool.QueryRow(context.Background(),
			`SELECT count(*) FROM practice_sessions WHERE user_id = $1`, other).Scan(&n)
		if n != 0 {
			t.Errorf("%d practice sessions outlived the account", n)
		}
		pool.QueryRow(context.Background(),
			`SELECT count(*) FROM note_stats WHERE user_id = $1`, other).Scan(&n)
		if n != 0 {
			t.Errorf("%d note stats outlived the account", n)
		}
	})

	t.Run("refuses to delete yourself", func(t *testing.T) {
		rec := call(t, s.handleDeleteUser, "DELETE", "/api/admin/users/x", admin, admin, nil)
		if rec.Code != http.StatusBadRequest {
			t.Errorf("status = %d, want 400", rec.Code)
		}
		if !userExists(t, pool, admin) {
			t.Fatal("the acting admin deleted themselves")
		}
	})

	t.Run("404s on an account that is not there", func(t *testing.T) {
		rec := call(t, s.handleDeleteUser, "DELETE", "/api/admin/users/x", admin,
			"00000000-0000-0000-0000-000000000000", nil)
		if rec.Code != http.StatusNotFound {
			t.Errorf("status = %d, want 404", rec.Code)
		}
	})
}

func TestAdminResetsPasswords(t *testing.T) {
	pool := testDB(t)
	testPool = pool
	s := &server{db: pool, jwtSecret: []byte("test"), corsOrigin: "http://localhost:3000"}

	admin := testUser(t, pool)
	makeAdmin(t, pool, admin)

	t.Run("sets a password the account can then log in with", func(t *testing.T) {
		other := testUser(t, pool)
		rec := call(t, s.handleResetPassword, "PUT", "/api/admin/users/x/password", admin, other,
			map[string]string{"password": "newpassword1"})
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200: %s", rec.Code, rec.Body.String())
		}

		var hash string
		pool.QueryRow(context.Background(),
			`SELECT password_hash FROM users WHERE id = $1`, other).Scan(&hash)
		if !checkPassword(hash, "newpassword1") {
			t.Error("the new password does not open the account")
		}
		if hash == "newpassword1" {
			t.Error("the password was stored in plaintext")
		}
	})

	t.Run("holds the new password to the same length rule as signup", func(t *testing.T) {
		other := testUser(t, pool)
		rec := call(t, s.handleResetPassword, "PUT", "/api/admin/users/x/password", admin, other,
			map[string]string{"password": "short"})
		if rec.Code != http.StatusBadRequest {
			t.Errorf("status = %d, want 400", rec.Code)
		}
	})
}

func TestAdminBootstrap(t *testing.T) {
	pool := testDB(t)
	testPool = pool
	ctx := context.Background()

	t.Run("promotes the configured account on start", func(t *testing.T) {
		uid := testUser(t, pool)
		var email string
		pool.QueryRow(ctx, `SELECT email FROM users WHERE id = $1`, uid).Scan(&email)

		if err := promoteAdmin(ctx, pool, email); err != nil {
			t.Fatalf("promoteAdmin: %v", err)
		}
		if !isAdminInDB(t, pool, uid) {
			t.Error("the configured account was not promoted")
		}
	})

	t.Run("matches the address however it was typed", func(t *testing.T) {
		uid := testUser(t, pool)
		var email string
		pool.QueryRow(ctx, `SELECT email FROM users WHERE id = $1`, uid).Scan(&email)

		if err := promoteAdmin(ctx, pool, "  "+upperFirst(email)+" "); err != nil {
			t.Fatalf("promoteAdmin: %v", err)
		}
		if !isAdminInDB(t, pool, uid) {
			t.Error("a differently cased address did not match")
		}
	})

	// The account usually does not exist yet on the first deploy: whoever it
	// is has not signed up. That must not stop the API from starting.
	t.Run("is not an error when nobody has that address yet", func(t *testing.T) {
		if err := promoteAdmin(ctx, pool, "nobody-here@example.com"); err != nil {
			t.Errorf("promoteAdmin: %v", err)
		}
	})

	t.Run("does nothing when no address is configured", func(t *testing.T) {
		if err := promoteAdmin(ctx, pool, ""); err != nil {
			t.Errorf("promoteAdmin: %v", err)
		}
	})
}

func upperFirst(s string) string {
	if s == "" {
		return s
	}
	b := []byte(s)
	if b[0] >= 'a' && b[0] <= 'z' {
		b[0] -= 32
	}
	return string(b)
}
