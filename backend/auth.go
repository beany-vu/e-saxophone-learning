package main

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type ctxKey string

const userIDKey ctxKey = "userID"
const cookieName = "yds_session"
const sessionTTL = 30 * 24 * time.Hour

// hashPassword turns a plaintext password into a bcrypt hash for storage.
func hashPassword(pw string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(pw), bcrypt.DefaultCost)
	return string(b), err
}

// checkPassword returns true when the plaintext matches the stored hash.
func checkPassword(hash, pw string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(pw)) == nil
}

// issueToken creates a signed JWT whose subject is the user id.
func (s *server) issueToken(userID string) (string, error) {
	claims := jwt.RegisteredClaims{
		Subject:   userID,
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(sessionTTL)),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return tok.SignedString(s.jwtSecret)
}

// parseToken verifies a JWT's signature and returns its subject (user id).
func (s *server) parseToken(tokenStr string) (string, error) {
	claims := &jwt.RegisteredClaims{}
	_, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return s.jwtSecret, nil
	})
	if err != nil {
		return "", err
	}
	return claims.Subject, nil
}

func (s *server) setSessionCookie(w http.ResponseWriter, token string) {
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    token,
		Path:     "/",
		HttpOnly: true, // JS cannot read it, which blocks token theft via XSS
		SameSite: http.SameSiteLaxMode,
		Secure:   s.cookieSecure,
		MaxAge:   int(sessionTTL.Seconds()),
	})
}

func (s *server) clearSessionCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     cookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		// Must match the attributes it was set with, or the browser keeps the
		// original cookie and logout silently does nothing.
		Secure: s.cookieSecure,
		MaxAge: -1,
	})
}

// requireAuth wraps a handler so it only runs for a request carrying a valid
// session cookie. The user id is stashed on the request context.
func (s *server) requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		c, err := r.Cookie(cookieName)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "not authenticated")
			return
		}
		uid, err := s.parseToken(c.Value)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "invalid session")
			return
		}
		ctx := context.WithValue(r.Context(), userIDKey, uid)
		next(w, r.WithContext(ctx))
	}
}

func userIDFrom(ctx context.Context) string {
	v, _ := ctx.Value(userIDKey).(string)
	return v
}
