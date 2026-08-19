package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// A stand-in for the practice API, so the server can be driven end to end
// without a database or a real account.
func fakeAPI(t *testing.T) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()
	mux.HandleFunc("/api/auth/me", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]any{
			"displayName":     "Test",
			"courseStart":     "2026-08-19",
			"courseTargetEnd": "2027-01-05",
			"courseWeeksDone": []int{1, 2},
		})
	})
	mux.HandleFunc("/api/practice/summary", func(w http.ResponseWriter, r *http.Request) {
		json.NewEncoder(w).Encode(map[string]any{
			"totalSessions": 3,
			"totalNotes":    120,
			"totalSeconds":  3720,
			"noteCounts":    map[string]int{"67": 40, "72": 2, "69": 78},
			"recentSessions": []map[string]any{
				{"source": "song", "durationSeconds": 600, "notesPlayed": 40, "startedAt": "2026-08-20T10:00:00Z"},
			},
			"itemStats": []map[string]any{
				{"item": "twinkle", "source": "song", "timesPlayed": 2, "bestAccuracy": 88,
					"totalSeconds": 600, "lastPlayedAt": "2026-08-20T10:00:00Z"},
			},
		})
	})
	server := httptest.NewServer(mux)
	t.Cleanup(server.Close)
	return server
}

func send(t *testing.T, c *client, method string, params string) response {
	t.Helper()
	req := request{JSONRPC: "2.0", ID: json.RawMessage(`1`), Method: method}
	if params != "" {
		req.Params = json.RawMessage(params)
	}
	res := handle(c, req)
	if res == nil {
		t.Fatalf("%s returned no response", method)
	}
	return *res
}

func toolText(t *testing.T, res response) string {
	t.Helper()
	raw, _ := json.Marshal(res.Result)
	var out struct {
		Content []struct {
			Text string `json:"text"`
		} `json:"content"`
		IsError bool `json:"isError"`
	}
	json.Unmarshal(raw, &out)
	if len(out.Content) == 0 {
		t.Fatalf("no content in %s", raw)
	}
	return out.Content[0].Text
}

func TestProtocol(t *testing.T) {
	c := newClient(fakeAPI(t).URL)

	t.Run("introduces itself and says it has tools", func(t *testing.T) {
		res := send(t, c, "initialize", "")
		raw, _ := json.Marshal(res.Result)
		if !strings.Contains(string(raw), "protocolVersion") || !strings.Contains(string(raw), "tools") {
			t.Errorf("initialize result = %s", raw)
		}
	})

	t.Run("says nothing back to a notification", func(t *testing.T) {
		if handle(c, request{JSONRPC: "2.0", Method: "notifications/initialized"}) != nil {
			t.Error("answered a notification, which breaks the protocol")
		}
	})

	t.Run("lists every tool with a description and a schema", func(t *testing.T) {
		res := send(t, c, "tools/list", "")
		raw, _ := json.Marshal(res.Result)
		var out struct {
			Tools []tool `json:"tools"`
		}
		json.Unmarshal(raw, &out)
		if len(out.Tools) < 4 {
			t.Fatalf("only %d tools", len(out.Tools))
		}
		for _, tl := range out.Tools {
			if len(tl.Description) < 30 {
				t.Errorf("%s has a thin description", tl.Name)
			}
			if tl.InputSchema == nil {
				t.Errorf("%s has no input schema", tl.Name)
			}
		}
	})

	t.Run("refuses an unknown method, but only when it was asked", func(t *testing.T) {
		res := send(t, c, "nonsense/method", "")
		if res.Error == nil {
			t.Error("no error for an unknown method")
		}
		if handle(c, request{JSONRPC: "2.0", Method: "nonsense/notification"}) != nil {
			t.Error("answered an unknown notification")
		}
	})

	t.Run("reports a tool failure as a result, not a protocol error", func(t *testing.T) {
		res := send(t, c, "tools/call", `{"name":"no_such_tool"}`)
		if res.Error != nil {
			t.Error("a bad tool name should not be a protocol error")
		}
		if !strings.Contains(toolText(t, res), "unknown tool") {
			t.Errorf("text = %q", toolText(t, res))
		}
	})
}

func TestTools(t *testing.T) {
	c := newClient(fakeAPI(t).URL)

	t.Run("practice_summary reports totals and per item bests", func(t *testing.T) {
		text := toolText(t, send(t, c, "tools/call", `{"name":"practice_summary"}`))
		for _, want := range []string{"Sessions: 3", "Notes played: 120", "1 hours 2 minutes", "twinkle", "88%"} {
			if !strings.Contains(text, want) {
				t.Errorf("missing %q in:\n%s", want, text)
			}
		}
	})

	t.Run("course_status says where the learner is", func(t *testing.T) {
		text := toolText(t, send(t, c, "tools/call", `{"name":"course_status"}`))
		for _, want := range []string{"2026-08-19", "Weeks finished: 2 of 20", "2027-01-05"} {
			if !strings.Contains(text, want) {
				t.Errorf("missing %q in:\n%s", want, text)
			}
		}
	})

	t.Run("weak_notes names the gaps in the instrument's own spelling", func(t *testing.T) {
		text := toolText(t, send(t, c, "tools/call", `{"name":"weak_notes"}`))
		if !strings.Contains(text, "Bb3") {
			t.Errorf("range should be named with flats:\n%s", text)
		}
		if strings.Contains(text, "A#") {
			t.Errorf("should not use sharps for Bb:\n%s", text)
		}
		if !strings.Contains(text, "C5 (2 times)") {
			t.Errorf("least played note missing:\n%s", text)
		}
	})

	t.Run("recent_sessions honours its limit", func(t *testing.T) {
		text := toolText(t, send(t, c, "tools/call", `{"name":"recent_sessions","arguments":{"limit":1}}`))
		if strings.Count(strings.TrimSpace(text), "\n") != 0 {
			t.Errorf("want one line, got:\n%s", text)
		}
	})
}

func TestHelpers(t *testing.T) {
	t.Run("spells notes the way the instrument labels its keys", func(t *testing.T) {
		cases := map[int]string{58: "Bb3", 60: "C4", 63: "Eb4", 66: "F#4", 73: "C#5", 85: "C#6"}
		for midi, want := range cases {
			if got := noteName(midi); got != want {
				t.Errorf("noteName(%d) = %s, want %s", midi, got, want)
			}
		}
	})

	t.Run("counts course weeks from the learner's own start", func(t *testing.T) {
		start := "2026-08-19"
		if got := weekOf(start, time.Date(2026, 8, 19, 12, 0, 0, 0, time.UTC)); got != 1 {
			t.Errorf("first day = week %d", got)
		}
		if got := weekOf(start, time.Date(2026, 8, 26, 12, 0, 0, 0, time.UTC)); got != 2 {
			t.Errorf("eighth day = week %d", got)
		}
		if got := weekOf(start, time.Date(2026, 8, 1, 12, 0, 0, 0, time.UTC)); got != 0 {
			t.Errorf("before the start = week %d, want 0", got)
		}
	})

	t.Run("finds notes never played inside the taught range", func(t *testing.T) {
		never, rare := neglectedNotes(map[string]int{"58": 5, "72": 1})
		if len(never) != rangeHigh-rangeLow+1-2 {
			t.Errorf("never played count = %d", len(never))
		}
		if len(rare) != 2 || !strings.HasPrefix(rare[0], "C5") {
			t.Errorf("rare = %v, want the least played first", rare)
		}
	})
}
