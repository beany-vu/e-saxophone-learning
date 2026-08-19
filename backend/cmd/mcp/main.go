// An MCP server for the practice tracker, so an AI assistant can read how the
// course is going and give feedback on it.
//
// MCP is JSON-RPC 2.0 over stdin and stdout, one message per line. That is
// little enough protocol to implement directly, which keeps this a single Go
// file with no dependencies, built by the same toolchain as the API.
//
// Read only on purpose. An assistant that can see your practice is useful; one
// that can quietly rewrite it is a different decision, and not one to make by
// accident.
package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"
)

const protocolVersion = "2024-11-05"

// ---------------------------------------------------------------- JSON-RPC

type request struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      json.RawMessage `json:"id,omitempty"`
	Method  string          `json:"method"`
	Params  json.RawMessage `json:"params,omitempty"`
}

type response struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      json.RawMessage `json:"id,omitempty"`
	Result  any             `json:"result,omitempty"`
	Error   *rpcError       `json:"error,omitempty"`
}

type rpcError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

type tool struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	InputSchema any    `json:"inputSchema"`
}

// ---------------------------------------------------------------- the app

// client talks to the practice API, holding the session cookie the way a
// browser would.
type client struct {
	baseURL string
	http    *http.Client
}

func newClient(baseURL string) *client {
	jar, _ := cookiejar.New(nil)
	return &client{baseURL: baseURL, http: &http.Client{Jar: jar, Timeout: 10 * time.Second}}
}

func (c *client) login(email, password string) error {
	body, _ := json.Marshal(map[string]string{"email": email, "password": password})
	res, err := c.http.Post(c.baseURL+"/api/auth/login", "application/json", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("cannot reach the API at %s: %w", c.baseURL, err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("login failed with status %d", res.StatusCode)
	}
	return nil
}

func (c *client) get(path string, into any) error {
	res, err := c.http.Get(c.baseURL + path)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("%s returned %d", path, res.StatusCode)
	}
	return json.NewDecoder(res.Body).Decode(into)
}

type user struct {
	DisplayName string `json:"displayName"`
	CourseStart string `json:"courseStart"`
	TargetEnd   string `json:"courseTargetEnd"`
	WeeksDone   []int  `json:"courseWeeksDone"`
}

type itemStat struct {
	Item         string `json:"item"`
	Source       string `json:"source"`
	TimesPlayed  int    `json:"timesPlayed"`
	BestAccuracy int    `json:"bestAccuracy"`
	TotalSeconds int    `json:"totalSeconds"`
	LastPlayedAt string `json:"lastPlayedAt"`
}

type sessionBrief struct {
	Source          string `json:"source"`
	DurationSeconds int    `json:"durationSeconds"`
	NotesPlayed     int    `json:"notesPlayed"`
	StartedAt       string `json:"startedAt"`
}

type summary struct {
	TotalSessions  int            `json:"totalSessions"`
	TotalNotes     int            `json:"totalNotes"`
	TotalSeconds   int            `json:"totalSeconds"`
	NoteCounts     map[string]int `json:"noteCounts"`
	RecentSessions []sessionBrief `json:"recentSessions"`
	ItemStats      []itemStat     `json:"itemStats"`
}

// ---------------------------------------------------------------- helpers

// noteNames spells black notes the way the instrument labels its own keys, so
// an assistant reading this talks about Bb rather than A#, like the app does.
var noteNames = []string{"C", "C#", "D", "Eb", "E", "F", "F#", "G", "G#", "A", "Bb", "B"}

func noteName(midi int) string {
	return noteNames[((midi%12)+12)%12] + strconv.Itoa(midi/12-1)
}

func formatDuration(seconds int) string {
	if seconds < 60 {
		return fmt.Sprintf("%d seconds", seconds)
	}
	if seconds < 3600 {
		return fmt.Sprintf("%d minutes", seconds/60)
	}
	return fmt.Sprintf("%d hours %d minutes", seconds/3600, (seconds%3600)/60)
}

// The written range the app teaches fingerings for: Bb3 up to C#6.
const rangeLow, rangeHigh = 58, 85

// neglectedNotes lists what is inside the playable range but rarely or never
// played, which is the most useful thing an assistant can point at.
func neglectedNotes(counts map[string]int) (never []string, rare []string) {
	type noteCount struct {
		midi  int
		count int
	}
	played := map[int]int{}
	for key, count := range counts {
		midi, err := strconv.Atoi(key)
		if err == nil {
			played[midi] = count
		}
	}

	var seen []noteCount
	for midi := rangeLow; midi <= rangeHigh; midi++ {
		count, ok := played[midi]
		if !ok || count == 0 {
			never = append(never, noteName(midi))
			continue
		}
		seen = append(seen, noteCount{midi, count})
	}

	sort.Slice(seen, func(i, j int) bool { return seen[i].count < seen[j].count })
	for i, n := range seen {
		if i >= 5 {
			break
		}
		rare = append(rare, fmt.Sprintf("%s (%d times)", noteName(n.midi), n.count))
	}
	return never, rare
}

func weekOf(start string, now time.Time) int {
	began, err := time.Parse("2006-01-02", start)
	if err != nil {
		return 0
	}
	days := int(now.Sub(began).Hours() / 24)
	if days < 0 {
		return 0
	}
	return days/7 + 1
}

// ---------------------------------------------------------------- the tools

func tools() []tool {
	noArgs := map[string]any{"type": "object", "properties": map[string]any{}}
	return []tool{
		{
			Name: "practice_summary",
			Description: "Lifetime practice totals for the signed-in learner: sessions, notes " +
				"played, time spent, and how each warm-up and song has gone. Start here when " +
				"asked how practice is going.",
			InputSchema: noArgs,
		},
		{
			Name: "course_status",
			Description: "Where the learner is in the twenty week course: start date, target " +
				"finish, which weeks are ticked off, and which week the calendar says they " +
				"should be on. Use this to tell whether they are on track.",
			InputSchema: noArgs,
		},
		{
			Name: "weak_notes",
			Description: "Notes inside the playable range that the learner never plays or " +
				"plays rarely. These are the gaps worth practising, and the most useful thing " +
				"to give feedback on.",
			InputSchema: noArgs,
		},
		{
			Name: "recent_sessions",
			Description: "The most recent practice sessions, newest first, with what was " +
				"practised and for how long. Use it to see whether practice is regular.",
			InputSchema: map[string]any{
				"type": "object",
				"properties": map[string]any{
					"limit": map[string]any{
						"type":        "integer",
						"description": "How many to return, at most 10",
					},
				},
			},
		},
	}
}

func (c *client) call(name string, args map[string]any) (string, error) {
	switch name {
	case "practice_summary":
		var s summary
		if err := c.get("/api/practice/summary", &s); err != nil {
			return "", err
		}
		var b strings.Builder
		fmt.Fprintf(&b, "Sessions: %d\nNotes played: %d\nTime practised: %s\n",
			s.TotalSessions, s.TotalNotes, formatDuration(s.TotalSeconds))
		if len(s.ItemStats) == 0 {
			b.WriteString("\nNo warm-up or song has been saved yet.\n")
			return b.String(), nil
		}
		b.WriteString("\nPer item, best attempt:\n")
		for _, item := range s.ItemStats {
			fmt.Fprintf(&b, "  %-22s %s  played %dx  best %d%%  %s  last %s\n",
				item.Item, item.Source, item.TimesPlayed, item.BestAccuracy,
				formatDuration(item.TotalSeconds), item.LastPlayedAt[:10])
		}
		return b.String(), nil

	case "course_status":
		var u user
		if err := c.get("/api/auth/me", &u); err != nil {
			return "", err
		}
		var b strings.Builder
		fmt.Fprintf(&b, "Learner: %s\n", u.DisplayName)
		if u.CourseStart == "" {
			b.WriteString("The course has no start date set yet.\n")
			return b.String(), nil
		}
		calendar := weekOf(u.CourseStart, time.Now())
		fmt.Fprintf(&b, "Started: %s\nCalendar week: %d of 20\n", u.CourseStart, calendar)
		if u.TargetEnd != "" {
			fmt.Fprintf(&b, "Wants to finish by: %s\n", u.TargetEnd)
		}
		fmt.Fprintf(&b, "Weeks finished: %d of 20\n", len(u.WeeksDone))
		if len(u.WeeksDone) > 0 {
			parts := make([]string, len(u.WeeksDone))
			for i, w := range u.WeeksDone {
				parts[i] = strconv.Itoa(w)
			}
			fmt.Fprintf(&b, "Which: %s\n", strings.Join(parts, ", "))
		}
		if calendar > 0 && len(u.WeeksDone) < calendar-1 {
			fmt.Fprintf(&b, "Behind the calendar by roughly %d weeks.\n", calendar-1-len(u.WeeksDone))
		}
		return b.String(), nil

	case "weak_notes":
		var s summary
		if err := c.get("/api/practice/summary", &s); err != nil {
			return "", err
		}
		never, rare := neglectedNotes(s.NoteCounts)
		var b strings.Builder
		fmt.Fprintf(&b, "Range taught: %s to %s (written pitch, the note fingered)\n\n",
			noteName(rangeLow), noteName(rangeHigh))
		if len(never) == 0 {
			b.WriteString("Every note in the range has been played at least once.\n")
		} else {
			fmt.Fprintf(&b, "Never played (%d): %s\n", len(never), strings.Join(never, " "))
		}
		if len(rare) > 0 {
			fmt.Fprintf(&b, "Played least: %s\n", strings.Join(rare, ", "))
		}
		return b.String(), nil

	case "recent_sessions":
		var s summary
		if err := c.get("/api/practice/summary", &s); err != nil {
			return "", err
		}
		limit := 10
		if raw, ok := args["limit"].(float64); ok && int(raw) > 0 && int(raw) < limit {
			limit = int(raw)
		}
		if len(s.RecentSessions) == 0 {
			return "No sessions saved yet.\n", nil
		}
		var b strings.Builder
		for i, session := range s.RecentSessions {
			if i >= limit {
				break
			}
			fmt.Fprintf(&b, "%s  %-9s %s, %d notes\n", session.StartedAt[:10], session.Source,
				formatDuration(session.DurationSeconds), session.NotesPlayed)
		}
		return b.String(), nil
	}
	return "", fmt.Errorf("unknown tool: %s", name)
}

// ---------------------------------------------------------------- the loop

// handle answers one request, or returns nil for a notification, which by
// definition gets no reply.
func handle(c *client, req request) *response {
	reply := func(result any) *response {
		return &response{JSONRPC: "2.0", ID: req.ID, Result: result}
	}

	switch req.Method {
	case "initialize":
		return reply(map[string]any{
			"protocolVersion": protocolVersion,
			"capabilities":    map[string]any{"tools": map[string]any{}},
			"serverInfo":      map[string]any{"name": "yds120-practice", "version": "1.0.0"},
		})

	case "notifications/initialized":
		return nil

	case "ping":
		return reply(map[string]any{})

	case "tools/list":
		return reply(map[string]any{"tools": tools()})

	case "tools/call":
		var params struct {
			Name      string         `json:"name"`
			Arguments map[string]any `json:"arguments"`
		}
		json.Unmarshal(req.Params, &params)

		text, err := c.call(params.Name, params.Arguments)
		if err != nil {
			// Reported as a tool result rather than a protocol error, so the
			// assistant can read what went wrong and say so.
			return reply(map[string]any{
				"content": []map[string]any{{"type": "text", "text": "Error: " + err.Error()}},
				"isError": true,
			})
		}
		return reply(map[string]any{
			"content": []map[string]any{{"type": "text", "text": text}},
		})
	}

	if len(req.ID) == 0 {
		return nil // an unknown notification is not an error
	}
	return &response{
		JSONRPC: "2.0",
		ID:      req.ID,
		Error:   &rpcError{Code: -32601, Message: "unknown method: " + req.Method},
	}
}

func serve(c *client, in io.Reader, out io.Writer) error {
	reader := bufio.NewReader(in)
	encoder := json.NewEncoder(out)
	for {
		line, err := reader.ReadBytes('\n')
		if len(bytes.TrimSpace(line)) > 0 {
			var req request
			if err := json.Unmarshal(line, &req); err == nil {
				if res := handle(c, req); res != nil {
					if err := encoder.Encode(res); err != nil {
						return err
					}
				}
			}
		}
		if err != nil {
			if err == io.EOF {
				return nil
			}
			return err
		}
	}
}

func main() {
	base := os.Getenv("YDS_API_URL")
	if base == "" {
		base = "http://api:8080"
	}
	c := newClient(base)

	// Logged in once at startup. Everything below reads one learner's data,
	// which is the point: the assistant is looking at your practice, not at
	// everybody's.
	if email, password := os.Getenv("YDS_EMAIL"), os.Getenv("YDS_PASSWORD"); email != "" {
		if err := c.login(email, password); err != nil {
			// Logged to stderr, never stdout: stdout is the protocol channel
			// and anything else on it breaks the connection.
			fmt.Fprintln(os.Stderr, "yds120 mcp: "+err.Error())
		}
	} else {
		fmt.Fprintln(os.Stderr, "yds120 mcp: set YDS_EMAIL and YDS_PASSWORD to read your practice")
	}

	if err := serve(c, os.Stdin, os.Stdout); err != nil {
		fmt.Fprintln(os.Stderr, "yds120 mcp:", err)
		os.Exit(1)
	}
}
