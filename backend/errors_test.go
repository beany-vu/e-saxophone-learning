package main

import (
	"errors"
	"fmt"
	"testing"

	"github.com/jackc/pgx/v5/pgconn"
)

// Postgres reports a violated UNIQUE constraint as SQLSTATE 23505. Matching on
// the code is stable, unlike matching on the text of the error message.
func TestIsUniqueViolation(t *testing.T) {
	dupe := &pgconn.PgError{Code: "23505", ConstraintName: "users_email_key"}

	cases := []struct {
		name string
		err  error
		want bool
	}{
		{"nil error", nil, false},
		{"plain error", errors.New("connection reset"), false},
		{"unique violation", dupe, true},
		{"wrapped unique violation", fmt.Errorf("insert user: %w", dupe), true},
		{"foreign key violation", &pgconn.PgError{Code: "23503"}, false},
		{"not null violation", &pgconn.PgError{Code: "23502"}, false},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := isUniqueViolation(c.err); got != c.want {
				t.Errorf("isUniqueViolation() = %v, want %v", got, c.want)
			}
		})
	}
}
