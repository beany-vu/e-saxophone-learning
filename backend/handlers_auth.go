package main

import (
	"time"
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5"
)

type authRequest struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	DisplayName string `json:"displayName"`
}

type userResponse struct {
	ID          string `json:"id"`
	Email       string `json:"email"`
	DisplayName string `json:"displayName"`
	// Empty until the learner picks dates. Each account has its own, so two
	// people are not marched through the same calendar.
	CourseStart string `json:"courseStart"`
	TargetEnd   string `json:"courseTargetEnd"`
	WeeksDone   []int  `json:"courseWeeksDone"`
}

// handleSignup creates an account, then logs the user in by setting the cookie.
func (s *server) handleSignup(w http.ResponseWriter, r *http.Request) {
	var req authRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if req.Email == "" || len(req.Password) < 8 {
		writeError(w, http.StatusBadRequest, "email required and password must be at least 8 characters")
		return
	}

	hash, err := hashPassword(req.Password)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not hash password")
		return
	}
	displayName := strings.TrimSpace(req.DisplayName)
	if displayName == "" {
		displayName = strings.Split(req.Email, "@")[0]
	}

	var u userResponse
	err = s.db.QueryRow(r.Context(),
		`INSERT INTO users (email, password_hash, display_name)
		 VALUES ($1, $2, $3)
		 RETURNING id, email, display_name`,
		req.Email, hash, displayName,
	).Scan(&u.ID, &u.Email, &u.DisplayName)
	if err != nil {
		if isUniqueViolation(err) {
			writeError(w, http.StatusConflict, "an account with that email already exists")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not create account")
		return
	}

	token, err := s.issueToken(u.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not issue session")
		return
	}
	s.setSessionCookie(w, token)
	writeJSON(w, http.StatusCreated, u)
}

// handleLogin verifies credentials and sets the session cookie.
func (s *server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req authRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid body")
		return
	}
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	var id, hash string
	var u userResponse
	err := s.db.QueryRow(r.Context(),
		`SELECT id, password_hash, email, display_name FROM users WHERE email = $1`,
		req.Email,
	).Scan(&id, &hash, &u.Email, &u.DisplayName)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			writeError(w, http.StatusUnauthorized, "invalid email or password")
			return
		}
		writeError(w, http.StatusInternalServerError, "login failed")
		return
	}
	if !checkPassword(hash, req.Password) {
		writeError(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	u.ID = id
	token, err := s.issueToken(id)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not issue session")
		return
	}
	s.setSessionCookie(w, token)
	writeJSON(w, http.StatusOK, u)
}

func (s *server) handleLogout(w http.ResponseWriter, _ *http.Request) {
	s.clearSessionCookie(w)
	writeJSON(w, http.StatusOK, map[string]string{"status": "logged out"})
}

// handleMe returns the currently logged-in user (used by the frontend to know
// whether someone is signed in).
func (s *server) handleMe(w http.ResponseWriter, r *http.Request) {
	uid := userIDFrom(r.Context())
	var u userResponse
	var start, target *time.Time
	u.WeeksDone = []int{}
	err := s.db.QueryRow(r.Context(),
		`SELECT id, email, display_name, course_start, course_target_end, course_weeks_done
		 FROM users WHERE id = $1`, uid,
	).Scan(&u.ID, &u.Email, &u.DisplayName, &start, &target, &u.WeeksDone)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "session user not found")
		return
	}
	if start != nil {
		u.CourseStart = start.Format(dateLayout)
	}
	if target != nil {
		u.TargetEnd = target.Format(dateLayout)
	}
	writeJSON(w, http.StatusOK, u)
}
