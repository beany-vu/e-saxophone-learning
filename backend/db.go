package main

import (
	"context"
	_ "embed"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed schema.sql
var schemaSQL string

func connectDB(ctx context.Context, url string) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		return nil, fmt.Errorf("create pool: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping: %w", err)
	}
	return pool, nil
}

// connectWithRetry waits for Postgres to accept connections (it may still be
// starting when the API container comes up).
func connectWithRetry(ctx context.Context, url string, attempts int) (*pgxpool.Pool, error) {
	var lastErr error
	for i := 0; i < attempts; i++ {
		pool, err := connectDB(ctx, url)
		if err == nil {
			return pool, nil
		}
		lastErr = err
		log.Printf("waiting for database (%d/%d): %v", i+1, attempts, err)
		time.Sleep(2 * time.Second)
	}
	return nil, lastErr
}

func migrate(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, schemaSQL)
	return err
}
