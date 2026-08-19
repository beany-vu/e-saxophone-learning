package main

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// adminUser is one row of the user list: who they are, what they may do, and
// enough practice history to tell an active learner from an abandoned signup.
type adminUser struct {
	ID               string `json:"id"`
	Email            string `json:"email"`
	DisplayName      string `json:"displayName"`
	IsAdmin          bool   `json:"isAdmin"`
	CreatedAt        string `json:"createdAt"`
	Sessions         int    `json:"sessions"`
	NotesPlayed      int    `json:"notesPlayed"`
	CorrectNotes     int    `json:"correctNotes"`
	SecondsPractised int    `json:"secondsPractised"`
	// Empty when they have never saved a session.
	LastPracticedAt string `json:"lastPracticedAt"`
}

// handleListUsers returns every account with its practice totals. The password
// hash is never selected, so it cannot be leaked by a later edit here.
func (s *server) handleListUsers(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(r.Context(),
		`SELECT u.id, u.email, u.display_name, u.is_admin, u.created_at,
		        count(p.id),
		        coalesce(sum(p.notes_played), 0),
		        coalesce(sum(p.correct_notes), 0),
		        coalesce(sum(p.duration_seconds), 0),
		        max(p.created_at)
		   FROM users u
		   LEFT JOIN practice_sessions p ON p.user_id = u.id
		  GROUP BY u.id
		  ORDER BY u.created_at`)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not list users")
		return
	}
	defer rows.Close()

	users := []adminUser{}
	for rows.Next() {
		var u adminUser
		var created time.Time
		var last *time.Time
		if err := rows.Scan(&u.ID, &u.Email, &u.DisplayName, &u.IsAdmin, &created,
			&u.Sessions, &u.NotesPlayed, &u.CorrectNotes, &u.SecondsPractised, &last); err != nil {
			writeError(w, http.StatusInternalServerError, "could not read users")
			return
		}
		u.CreatedAt = created.Format(time.RFC3339)
		if last != nil {
			u.LastPracticedAt = last.Format(time.RFC3339)
		}
		users = append(users, u)
	}
	if rows.Err() != nil {
		writeError(w, http.StatusInternalServerError, "could not read users")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"users": users})
}

type setAdminRequest struct {
	IsAdmin bool `json:"isAdmin"`
}

// handleSetUserAdmin promotes or demotes one account.
func (s *server) handleSetUserAdmin(w http.ResponseWriter, r *http.Request) {
	target := r.PathValue("id")
	var req setAdminRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	// Demoting yourself is the one change with no way back through the
	// interface: the page you would fix it from is the page you just lost.
	if target == userIDFrom(r.Context()) && !req.IsAdmin {
		writeError(w, http.StatusBadRequest, "you cannot remove your own admin rights")
		return
	}

	tag, err := s.db.Exec(r.Context(),
		`UPDATE users SET is_admin = $2 WHERE id = $1`, target, req.IsAdmin)
	if err != nil {
		writeUserLookupError(w, err, "could not update the account")
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "no such account")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"id": target, "isAdmin": req.IsAdmin})
}

// handleDeleteUser removes an account. Practice sessions and note stats go
// with it, through ON DELETE CASCADE in the schema.
func (s *server) handleDeleteUser(w http.ResponseWriter, r *http.Request) {
	target := r.PathValue("id")
	if target == userIDFrom(r.Context()) {
		writeError(w, http.StatusBadRequest, "you cannot delete your own account here")
		return
	}

	tag, err := s.db.Exec(r.Context(), `DELETE FROM users WHERE id = $1`, target)
	if err != nil {
		writeUserLookupError(w, err, "could not delete the account")
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "no such account")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted", "id": target})
}

type resetPasswordRequest struct {
	Password string `json:"password"`
}

// handleResetPassword sets a new password for an account that is locked out.
// There is no email round trip: the admin hands the new password over.
func (s *server) handleResetPassword(w http.ResponseWriter, r *http.Request) {
	target := r.PathValue("id")
	var req resetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	// The same rule signup applies, so a reset cannot create an account
	// weaker than one the owner could have made themselves.
	if len(req.Password) < 8 {
		writeError(w, http.StatusBadRequest, "password must be at least 8 characters")
		return
	}
	hash, err := hashPassword(req.Password)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not hash password")
		return
	}

	tag, err := s.db.Exec(r.Context(),
		`UPDATE users SET password_hash = $2 WHERE id = $1`, target, hash)
	if err != nil {
		writeUserLookupError(w, err, "could not set the password")
		return
	}
	if tag.RowsAffected() == 0 {
		writeError(w, http.StatusNotFound, "no such account")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "password set", "id": target})
}

// writeUserLookupError keeps a malformed id out of the 500s. Postgres rejects
// anything that is not a UUID before it ever looks for the row, which is a
// client mistake (404), not a server fault.
func writeUserLookupError(w http.ResponseWriter, err error, msg string) {
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "22P02" { // invalid_text_representation
		writeError(w, http.StatusNotFound, "no such account")
		return
	}
	if errors.Is(err, pgx.ErrNoRows) {
		writeError(w, http.StatusNotFound, "no such account")
		return
	}
	writeError(w, http.StatusInternalServerError, msg)
}
