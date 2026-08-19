package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// The OpenAPI document is hand written, which means it can drift from the code
// the moment someone adds an endpoint. These tests make that impossible: the
// document and the routing table have to agree, both ways.

type openAPIDoc struct {
	OpenAPI string `json:"openapi"`
	Info    struct {
		Title   string `json:"title"`
		Version string `json:"version"`
	} `json:"info"`
	Paths map[string]map[string]struct {
		Summary     string              `json:"summary"`
		Description string              `json:"description"`
		Security    []map[string][]any  `json:"security"`
		Responses   map[string]struct{} `json:"responses"`
	} `json:"paths"`
	Components struct {
		Schemas map[string]any `json:"schemas"`
	} `json:"components"`
}

func loadSpec(t *testing.T) openAPIDoc {
	t.Helper()
	var doc openAPIDoc
	if err := json.Unmarshal([]byte(openAPISpec), &doc); err != nil {
		t.Fatalf("openapi.json is not valid JSON: %v", err)
	}
	return doc
}

func TestOpenAPI(t *testing.T) {
	s := testServer()
	doc := loadSpec(t)

	t.Run("is a document a tool would accept", func(t *testing.T) {
		if doc.OpenAPI == "" {
			t.Error("no openapi version")
		}
		if doc.Info.Title == "" || doc.Info.Version == "" {
			t.Error("no title or version")
		}
	})

	t.Run("documents every route the server actually serves", func(t *testing.T) {
		for _, r := range s.Routes() {
			methods, ok := doc.Paths[r.Path]
			if !ok {
				t.Errorf("%s is routed but not documented", r.Path)
				continue
			}
			if _, ok := methods[lower(r.Method)]; !ok {
				t.Errorf("%s %s is routed but not documented", r.Method, r.Path)
			}
		}
	})

	t.Run("documents nothing the server does not serve", func(t *testing.T) {
		routed := map[string]bool{}
		for _, r := range s.Routes() {
			routed[lower(r.Method)+" "+r.Path] = true
		}
		for path, methods := range doc.Paths {
			for method := range methods {
				if !routed[method+" "+path] {
					t.Errorf("%s %s is documented but not routed", method, path)
				}
			}
		}
	})

	t.Run("marks exactly the endpoints that need a session", func(t *testing.T) {
		for _, r := range s.Routes() {
			op := doc.Paths[r.Path][lower(r.Method)]
			documented := len(op.Security) > 0
			if documented != r.Auth {
				t.Errorf("%s %s: auth is %v in code, %v in the document", r.Method, r.Path, r.Auth, documented)
			}
		}
	})

	t.Run("says what every endpoint is for", func(t *testing.T) {
		for path, methods := range doc.Paths {
			for method, op := range methods {
				if len(op.Summary) < 5 {
					t.Errorf("%s %s has no useful summary", method, path)
				}
				if len(op.Responses) == 0 {
					t.Errorf("%s %s documents no responses", method, path)
				}
			}
		}
	})

	t.Run("serves itself, without a session", func(t *testing.T) {
		rec := httptest.NewRecorder()
		s.handleOpenAPI(rec, httptest.NewRequest("GET", "/api/openapi.json", nil))
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d, want 200", rec.Code)
		}
		if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
			t.Errorf("content type = %q", ct)
		}
		var out map[string]any
		if err := json.Unmarshal(rec.Body.Bytes(), &out); err != nil {
			t.Errorf("served body is not JSON: %v", err)
		}
	})
}

func lower(s string) string {
	out := []rune(s)
	for i, r := range out {
		if r >= 'A' && r <= 'Z' {
			out[i] = r + 32
		}
	}
	return string(out)
}
