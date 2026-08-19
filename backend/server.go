package main

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
)

// server holds the shared dependencies every handler needs.
type server struct {
	db         *pgxpool.Pool
	jwtSecret  []byte
	corsOrigin string
	// cookieSecure marks the session cookie Secure, so the browser only ever
	// sends it over HTTPS. Off in local dev, which is plain http.
	cookieSecure bool
	// adminEmail is the address that gets the admin flag: at start-up if the
	// account already exists, and at signup if it does not yet. Empty means
	// no bootstrap admin.
	adminEmail string
}

// route is one endpoint. Keeping them as data rather than as a run of
// mux.HandleFunc calls means a test can compare the real routing table with
// the OpenAPI document, so the documentation cannot quietly go stale.
type route struct {
	Method string
	Path   string
	Auth   bool
	// Admin routes are also Auth routes: the gate needs a user before it can
	// ask what that user may do.
	Admin   bool
	handler http.HandlerFunc
}

// Routes is the whole API. Go 1.22+ lets the method go in the pattern.
func (s *server) Routes() []route {
	return []route{
		{"GET", "/health", false, false, s.handleHealth},
		{"GET", "/api/openapi.json", false, false, s.handleOpenAPI},

		{"POST", "/api/auth/signup", false, false, s.handleSignup},
		{"POST", "/api/auth/login", false, false, s.handleLogin},
		{"POST", "/api/auth/logout", false, false, s.handleLogout},
		{"GET", "/api/auth/me", true, false, s.handleMe},

		{"POST", "/api/practice/sessions", true, false, s.handleCreateSession},
		{"GET", "/api/practice/summary", true, false, s.handleSummary},
		{"PUT", "/api/practice/course", true, false, s.handleSetCourse},

		{"GET", "/api/admin/users", true, true, s.handleListUsers},
		{"PATCH", "/api/admin/users/{id}", true, true, s.handleSetUserAdmin},
		{"DELETE", "/api/admin/users/{id}", true, true, s.handleDeleteUser},
		{"PUT", "/api/admin/users/{id}/password", true, true, s.handleResetPassword},
	}
}

func (s *server) routes() http.Handler {
	mux := http.NewServeMux()
	for _, r := range s.Routes() {
		handler := r.handler
		if r.Admin {
			handler = s.requireAdmin(handler)
		}
		if r.Auth {
			handler = s.requireAuth(handler)
		}
		mux.HandleFunc(r.Method+" "+r.Path, handler)
	}
	return s.withMiddleware(mux)
}

// withMiddleware adds CORS (so a browser on the web origin can call the API
// directly with cookies) and request logging around every route.
func (s *server) withMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && (s.corsOrigin == "*" || origin == s.corsOrigin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Vary", "Origin")
		}
		if r.Method == http.MethodOptions {
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
			w.WriteHeader(http.StatusNoContent)
			return
		}
		log.Printf("%s %s", r.Method, r.URL.Path)
		next.ServeHTTP(w, r)
	})
}

func (s *server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}
