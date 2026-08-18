package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func testServer() *server {
	return &server{jwtSecret: []byte("test-secret"), corsOrigin: "http://localhost:3000"}
}

func TestPasswordHashRoundTrip(t *testing.T) {
	hash, err := hashPassword("saxophone123")
	if err != nil {
		t.Fatalf("hashPassword: %v", err)
	}
	if hash == "saxophone123" {
		t.Fatal("password was stored in plaintext")
	}
	if !checkPassword(hash, "saxophone123") {
		t.Error("correct password was rejected")
	}
	if checkPassword(hash, "saxophone124") {
		t.Error("wrong password was accepted")
	}
}

func TestHashIsSaltedSoTwoUsersDifferPerPassword(t *testing.T) {
	a, _ := hashPassword("same-password")
	b, _ := hashPassword("same-password")
	if a == b {
		t.Error("two hashes of the same password are identical, so it is not salted")
	}
}

func TestTokenRoundTrip(t *testing.T) {
	s := testServer()
	tok, err := s.issueToken("user-123")
	if err != nil {
		t.Fatalf("issueToken: %v", err)
	}
	got, err := s.parseToken(tok)
	if err != nil {
		t.Fatalf("parseToken: %v", err)
	}
	if got != "user-123" {
		t.Errorf("subject = %q, want %q", got, "user-123")
	}
}

func TestParseTokenRejectsBadInput(t *testing.T) {
	s := testServer()
	valid, _ := s.issueToken("user-123")

	other := &server{jwtSecret: []byte("a-different-secret")}
	forged, _ := other.issueToken("user-123")

	cases := []struct {
		name  string
		token string
	}{
		{"empty", ""},
		{"garbage", "not-a-jwt"},
		{"signed with another secret", forged},
		{"tampered payload", valid[:len(valid)-3] + "aaa"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if _, err := s.parseToken(c.token); err == nil {
				t.Error("expected an error, got nil")
			}
		})
	}
}

func TestRequireAuth(t *testing.T) {
	s := testServer()
	var sawUserID string
	protected := s.requireAuth(func(w http.ResponseWriter, r *http.Request) {
		sawUserID = userIDFrom(r.Context())
		w.WriteHeader(http.StatusOK)
	})

	t.Run("no cookie is rejected", func(t *testing.T) {
		rec := httptest.NewRecorder()
		protected(rec, httptest.NewRequest("GET", "/api/auth/me", nil))
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("status = %d, want 401", rec.Code)
		}
	})

	t.Run("invalid cookie is rejected", func(t *testing.T) {
		req := httptest.NewRequest("GET", "/api/auth/me", nil)
		req.AddCookie(&http.Cookie{Name: cookieName, Value: "nonsense"})
		rec := httptest.NewRecorder()
		protected(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("status = %d, want 401", rec.Code)
		}
	})

	t.Run("valid cookie passes the user id through", func(t *testing.T) {
		tok, _ := s.issueToken("user-abc")
		req := httptest.NewRequest("GET", "/api/auth/me", nil)
		req.AddCookie(&http.Cookie{Name: cookieName, Value: tok})
		rec := httptest.NewRecorder()
		protected(rec, req)
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200", rec.Code)
		}
		if sawUserID != "user-abc" {
			t.Errorf("handler saw user id %q, want %q", sawUserID, "user-abc")
		}
	})
}

func TestSessionCookieIsHardened(t *testing.T) {
	s := testServer()
	rec := httptest.NewRecorder()
	s.setSessionCookie(rec, "token-value")

	cookies := rec.Result().Cookies()
	if len(cookies) != 1 {
		t.Fatalf("got %d cookies, want 1", len(cookies))
	}
	c := cookies[0]
	if !c.HttpOnly {
		t.Error("cookie is not HttpOnly, so JavaScript could steal the session")
	}
	if c.SameSite != http.SameSiteLaxMode {
		t.Error("cookie is not SameSite=Lax")
	}
	if c.MaxAge <= 0 {
		t.Error("cookie has no lifetime")
	}
}

func TestClearSessionCookieExpiresIt(t *testing.T) {
	s := testServer()
	rec := httptest.NewRecorder()
	s.clearSessionCookie(rec)
	c := rec.Result().Cookies()[0]
	if c.MaxAge >= 0 {
		t.Errorf("MaxAge = %d, want negative so the browser deletes it", c.MaxAge)
	}
}
