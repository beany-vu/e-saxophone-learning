package main

import (
	_ "embed"
	"net/http"
)

// The API description, hand written and embedded in the binary the same way
// the schema is. openapi_test.go compares it against the routing table in both
// directions, so an endpoint cannot be added, removed or made public without
// the document following.
//
//go:embed openapi.json
var openAPISpec string

func (s *server) handleOpenAPI(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	// Deliberately public: documentation nobody can read without an account is
	// not documentation.
	w.Write([]byte(openAPISpec))
}
