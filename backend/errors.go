package main

import (
	"errors"

	"github.com/jackc/pgx/v5/pgconn"
)

// SQLSTATE 23505 is "unique_violation". Postgres error codes are part of its
// public contract, unlike the wording of the message.
const uniqueViolationCode = "23505"

// isUniqueViolation reports whether err (or anything it wraps) is a Postgres
// unique constraint violation.
func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	// errors.As walks the wrap chain and, if it finds a *pgconn.PgError,
	// assigns it to pgErr.
	if errors.As(err, &pgErr) {
		return pgErr.Code == uniqueViolationCode
	}
	return false
}
