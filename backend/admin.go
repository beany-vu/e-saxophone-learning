package main

import (
	"context"
	"log"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

// requireAdmin wraps a handler so it only runs for an account with the admin
// flag. It sits inside requireAuth, which has already turned the session
// cookie into a user id, so the only question left is what that user may do.
//
// The flag is read from the database on every request rather than carried in
// the token: a demoted admin has to lose access at once, not in thirty days
// when their session expires.
func (s *server) requireAdmin(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var admin bool
		err := s.db.QueryRow(r.Context(),
			`SELECT is_admin FROM users WHERE id = $1`, userIDFrom(r.Context()),
		).Scan(&admin)
		// A missing row means the account was deleted while its cookie lives
		// on. Same answer as an ordinary account: no.
		if err != nil || !admin {
			writeError(w, http.StatusForbidden, "admins only")
			return
		}
		next(w, r)
	}
}

// promoteAdmin marks the configured address as an admin, and is called once at
// start-up. It is deliberately forgiving: an empty setting means the deploy
// does not want a bootstrap admin, and an address nobody has signed up with
// yet is the normal state of a fresh database, not a reason to refuse to boot.
func promoteAdmin(ctx context.Context, pool *pgxpool.Pool, email string) error {
	email = strings.TrimSpace(strings.ToLower(email))
	if email == "" {
		return nil
	}
	tag, err := pool.Exec(ctx, `UPDATE users SET is_admin = true WHERE email = $1`, email)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		log.Printf("admin bootstrap: nobody has signed up as %s yet, they become an admin when they do", email)
		return nil
	}
	log.Printf("admin bootstrap: %s is an admin", email)
	return nil
}
