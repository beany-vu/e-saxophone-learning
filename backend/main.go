package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"time"
)

func main() {
	ctx := context.Background()

	dbURL := mustEnv("DATABASE_URL")
	jwtSecret := mustEnv("JWT_SECRET")
	port := getenv("PORT", "8080")
	corsOrigin := getenv("CORS_ORIGIN", "http://localhost:3000")
	cookieSecure := getenv("COOKIE_SECURE", "false") == "true"
	// Who to hand the keys to on a fresh database. Optional: without it the
	// stack still runs, it just has no admin until one is made by hand.
	adminEmail := os.Getenv("ADMIN_EMAIL")

	pool, err := connectWithRetry(ctx, dbURL, 15)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer pool.Close()

	if err := migrate(ctx, pool); err != nil {
		log.Fatalf("migrate: %v", err)
	}
	log.Println("database ready, schema applied")

	if err := promoteAdmin(ctx, pool, adminEmail); err != nil {
		log.Fatalf("admin bootstrap: %v", err)
	}

	s := &server{
		db:           pool,
		jwtSecret:    []byte(jwtSecret),
		corsOrigin:   corsOrigin,
		cookieSecure: cookieSecure,
		adminEmail:   adminEmail,
	}

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      s.routes(),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 15 * time.Second,
	}
	log.Printf("API listening on :%s", port)
	if err := srv.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}

func mustEnv(k string) string {
	v := os.Getenv(k)
	if v == "" {
		log.Fatalf("missing required env %s", k)
	}
	return v
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
