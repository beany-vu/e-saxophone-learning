# e-Saxophone Learning

A practice tool for digital saxophones, built for and tested on the Yamaha
YDS-120. Not affiliated with, endorsed by, or connected to Yamaha; the
instrument is named here only to say what the app works with. The browser listens to
every note you play, shows it live, and saves your history to your account.

Two ways in, switchable on the monitor page:

- **USB MIDI**, the accurate one. The instrument reports every note directly
- **Microphone**, the no-cable one. The computer listens to the instrument's
  speaker and works out the pitch from the sound

- **Five languages**: English, French, Vietnamese, Dutch, Spanish
- **Note names your way**: C D E, or do re mi, switchable and applied everywhere
- **Monitor** live keyboard, breath and velocity meters, raw event log
- **Learn** fingering chart in both directions, warm-ups, songs, your own melodies
- **Exercises** scale trainer that highlights the next note and scores accuracy
- **Progress** lifetime totals, recent sessions, and a note coverage heatmap
  showing which notes you avoid

## Requirements

| | |
|---|---|
| Browser | **Chrome or Edge.** Firefox and Safari do not implement Web MIDI. Microphone mode works in any of them |
| Docker | Docker Desktop with WSL integration enabled for this distro |
| Instrument | YDS-120 switched on. USB MIDI needs **MIDI controller mode** on the instrument and a USB-A to micro-B data cable, under 3 m, not USB 3.0. Microphone mode needs no cable at all |
| Address | Use **http://localhost:3000**. Browsers only give MIDI and microphone access to localhost or HTTPS, so a LAN address will be refused |

Nothing needs to be installed locally. Go, Node and Postgres all run in
containers.

## Quick start

```bash
cp .env.example .env          # optional, the defaults work for local dev
docker compose up -d --build  # first run pulls images and compiles, a few minutes
```

Then open **http://localhost:3000**, create an account, and go to Monitor.
Chrome will ask permission to use MIDI devices the first time. Allow it.

| Service | URL | What |
|---|---|---|
| web | http://localhost:3000 | Next.js app, the only thing you open in a browser |
| api | http://localhost:8080/health | Go API, mostly reached through the web proxy |
| db | localhost:5544 | Postgres, exposed for psql or a GUI client |

## Everyday commands

```bash
docker compose up -d                 # start everything
docker compose down                  # stop, keeping the database
docker compose ps                    # what is running
docker compose logs -f web           # follow frontend logs (or api, db)
docker compose restart api           # restart one service
```

Frontend source is bind-mounted, so **editing a file under `frontend/` reloads
the browser automatically**. No rebuild needed.

The Go API is compiled into its image, so backend changes need a rebuild:

```bash
docker compose up -d --build api
```

## Tests

```bash
docker compose run --rm api-test           # Go tests
docker compose exec web npm test           # frontend tests (vitest)
docker compose exec web npx tsc --noEmit   # typecheck, next dev does NOT do this
docker compose exec web npm run test:watch # rerun on save
```

`api-test` sits behind a compose profile, so `up` never starts it. It needs the
`db` service running, which it starts on demand.

**Run the typecheck before committing.** The dev server compiles without
checking types, so a type error stays invisible until `npm run build`.

We work test-first. Write the failing test, watch it fail for the right reason,
then make it pass.

## What the instrument actually sends

From the YDS-120 manual and its MIDI implementation chart, because two of these
are not what you would guess.

| | |
|---|---|
| MIDI controller mode | The instrument only transmits MIDI when its display reads **CtL**, past the A, S, T, b, C and U voice groups ([Fn] with VOICE jumps a group at a time). **Its speaker is silent on CtL**, so MIDI and microphone input cannot both work at once |
| Display codes | `A.01-A.17` alto, `S.01-S.13` soprano, `T.01-T.15` tenor, `b.01-b.11` baritone, `C.01-C.17` other, `U.01-U.20` user voices, `CtL` MIDI controller. It powers up on **A.01**, Alto Sax 1 |
| Breath | Arrives as **CC11 expression**, not CC2. The chart lists CC 1, 5, 6, 11, 38, 65, 100 and 101 as transmitted, and no CC2 at all |
| Note off | Not sent as its own message. The instrument sends note-on with velocity 0 instead, which `parseMidiMessage` treats as a note off |
| Transposition | Per voice, printed in the voice list: alto Eb (-9), soprano Bb (-2), tenor Bb (-14), baritone Eb (-21), other C (0). A few C voices carry an extra octave |
| Cable | USB-A to micro-B, under 3 m. The manual says explicitly not to use a USB 3.0 cable |
| Tuning | Adjustable 427 to 453 Hz, default 440. Pitch detection assumes 440 |

The no-keys fingering on any saxophone is written C#5, so on the default alto
voice the instrument sounds a concert E4 when you blow without touching a key.
That is correct, not a bug.

## Microphone mode

For when the cable is charge-only, or missing. The instrument's speaker is
picked up by the computer microphone and the pitch is worked out from the sound.

To use it: monitor page, press **Microphone**, then **Start listening** and
allow the microphone when Chrome asks.

| | |
|---|---|
| Headphones | **Unplug them.** They mute the built-in speaker, and then there is nothing to hear |
| Volume | Instrument volume up, and sit near the microphone. The level meter should move clearly while you play |
| Room | Quiet. Speech and music nearby can register as notes |
| Voice select | Match the voice group selected on the instrument. The microphone hears the sounding pitch, and the app converts back to what you finger using that voice's transposition |

What it cannot do as well as the cable: chords (one note at a time only),
the true breath controller reading (loudness stands in for it), and it will
always be a few tens of milliseconds behind. Notes are also slightly harder
to trigger quietly. For accurate practice records the cable is still better.

## Learn

The page that answers "which key do I press", and the material to practise with.

Two ranges are tracked separately, because they are different things. The
**instrument** plays written A3 to F#6. The **fingering chart** covers Bb3 to
C#6: the other six diagrams are in the manual and are not transcribed yet, so
the app says so instead of guessing at them.

**Fingering chart, both directions.** Pick a note and see which keys to hold, with
the finger that operates each one. Or click the keys you are holding and it names
the note that would come out, including when the combination is not a note at all.
Playing a note on a connected instrument fills the chart in as you go. It covers
written Bb3 to C#6; palm key notes above that are not included.

**Warm-ups and songs.** Seventeen exercises, from five notes and long tones through
scales in C, F, G and D, arpeggios, reading drills, rhythm, tonguing, breath control,
awkward finger joins and dynamics, plus six traditional melodies. Each one shows the next note, its fingering, a running
accuracy, and tells you when you played the right note in the wrong octave. Songs
with words show the syllable under each note.

**Listen first.** Every item plays through the speakers before you play it, at a
tempo you set, following along on the note strip and the fingering diagram. It plays
the sounding pitch, so it matches what your instrument will produce. In microphone
mode the app ignores its own playback rather than scoring it.

**One line at a time.** Every item is split into phrases, and any phrase can be
selected and drilled on its own, listened to on its own, and scored on its own.

**Compose** at `/compose`: click notes on the keyboard to write a tune. The
keyboard spans the **whole instrument**, written A3 to F#6, which is low A and
high F#, wider than an acoustic alto at both ends and just under three octaves. Pick a
time signature (2/4, 3/4, 4/4) and a note length, tick the dot to add half
again, and the bars work themselves out. Bar lines appear on the staff, each
note is heard as you place it, and a bar holding more than it should is
flagged rather than silently rearranged. Save it and it joins your melodies. Every note carries a **small fingering
diagram underneath**, so a tune reads as a row of grips rather than a row of
names. The trainer has the same, behind a toggle.

**Your own melodies.** Type a tune as note names, **one line per phrase**, with an
optional label:

```
Verse: G4 G4 A4 G4 C5 B4
Chorus: C5 D5 E5 F5 G5
```

Each line becomes a phrase you can drill on its own. **Octave numbers are optional**: a bare letter is placed at whichever octave sits
nearest the note before it, which is how melodies move, so you can type what the
sheet music shows without counting octaves.

Two switches handle the usual conversions:

- **Concert pitch**: sheet music for piano, voice or guitar is converted to what you
  finger, nine semitones up on an alto
- **Fit the range**: the whole tune is moved by octaves until it lands where the
  instrument can play it, which piano parts usually need

**Kalimba and jianpu tabs** can be typed as written. Switch the notation to numbers
and pick the key: `1` to `7` are the degrees of the major scale, an apostrophe is the
octave above (`3'`), a comma the octave below (`5,`).

Custom melodies are stored in the browser, not on the server.

**The course.** A dated 20 week plan, 19 August to 31 December 2026, shown a week
at a time: what this week is about, a goal you can check, what usually goes wrong,
and buttons straight to that week's exercises. Mark a week done and it carries a
check in the plan, the current week stays highlighted, and a bar tracks how much of
the course is behind you. Completion is explicit rather than derived from the date,
because the plan tells you to repeat a week when one goes badly.

**Reading music.** Every item can be shown on a treble staff, with the current note
highlighted as you play or as the demo runs, and the words under the notes. Notation
is the point of the exercise, so it is on by default.

**Settings** at `/settings`: language, whether notes read as C D E or do re mi,
and your course dates. Preferences live there so the other pages stay about
playing.

**Octave naming.** The chart labels every note both ways, `C4 / Yamaha C3`. MIDI and
scientific pitch notation call middle C `C4`; Yamaha instruments and most YDS tutorials
call it `C3`. Same note, labels an octave apart.

**If a note will not pass.** The runner shows what it actually heard next to what it
wanted. When the two are a fixed distance apart, one button corrects every note at once,
which is what you need if the instrument reports sounding pitch rather than fingered.

**Tracking.** Save an attempt and it lands on the Progress page: attempts, best
accuracy, time spent and when you last played it, per warm-up and per song.

## Talking to an AI assistant

`backend/cmd/mcp` is an MCP server, so an assistant such as Claude can read how
practice is going and give feedback on it. Four read-only tools:

| Tool | Answers |
|---|---|
| `practice_summary` | sessions, notes, time, and how each warm-up and song has gone |
| `course_status` | start date, target, weeks ticked off, which week the calendar says |
| `weak_notes` | notes in the playable range never or rarely played |
| `recent_sessions` | the last few sessions, to see whether practice is regular |

To connect it, put your account in `.env`:

```bash
YDS_EMAIL=you@example.com
YDS_PASSWORD=your-password
```

`.mcp.json` in the project root already points at it, so Claude Code picks it up
from this directory. It runs one process per conversation over stdio:

```bash
docker compose run --rm -T mcp     # what the assistant launches
```

**Read only, deliberately.** An assistant that can see your practice is useful;
one that can quietly rewrite it is a different decision, and not one to make by
accident. MCP is JSON-RPC over stdin and stdout, which is little enough protocol
to implement directly, so this is one Go file with no dependencies.

## Layout

```
backend/                Go API, one flat "package main"
  main.go               startup: env, database, migrations, listen
  db.go                 connection pool, schema.sql embedded and applied on boot
  server.go             routes, CORS and logging middleware
  auth.go               bcrypt, JWT, the requireAuth gate
  errors.go             Postgres error classification
  handlers_auth.go      signup, login, logout, me
  handlers_practice.go  save a session, read the summary
  schema.sql            users, practice_sessions, note_stats
  openapi.json          the API description, embedded and served
  openapi.go            serves it, and openapi_test.go stops it drifting
  cmd/mcp/main.go       the MCP server an AI assistant talks to
  *_test.go             tests live next to the code they cover

frontend/               Next.js 15, App Router, TypeScript
  app/                  one folder per route, page.tsx is the page
  components/           Nav, Piano, Fingering, Staff
  lib/input-context.tsx one shared input for the whole app (provider in the layout)
  lib/calibration.ts    fixed correction when every note arrives the same distance out
  hooks/useInput.ts     picks the input source, owns transposition and calibration
  hooks/useNoteStore.ts what is sounding and what has been played, source agnostic
  hooks/useMidi.ts      Web MIDI subscription, feeds the store
  hooks/useMic.ts       Web Audio plumbing for microphone mode, feeds the store
  lib/midi.ts           pure MIDI byte parsing (tested directly)
  lib/pitch.ts          pure pitch detection from audio samples (NSDF)
  lib/noteGate.ts       pure: pitch readings in, note on/off events out
  lib/notes.ts          note names, scales, transposition, voice table
  lib/fingerings.ts     which keys make which note, and the reverse lookup
  lib/curriculum.ts     warm-ups, songs, phrases, lyrics, the melody text parser
  lib/tone.ts           melody timing, tested without any audio
  lib/staff.ts          where a note sits on the treble staff
  lib/course.ts         the dated 20 week plan
  lib/compose.ts        note lengths, bars and time signatures
  lib/i18n.ts           the language list and lookup
  lib/i18n.<lang>.ts    one dictionary per language, 255 keys each
  lib/i18n-context.tsx  language and note naming, remembered in the browser
  lib/curriculum-i18n.ts French for the exercises and songs
  lib/course-i18n.ts    French for the course
  hooks/useMelodyPlayer.ts  plays a melody through the speakers
  lib/api.ts            typed fetch wrapper for the API
  lib/auth-context.tsx  who is logged in
  *.test.ts             tests live next to the code they cover
  Dockerfile            dev image: no build, compose bind-mounts the source
  Dockerfile.prod       production image: real `next build`, standalone output

docker-compose.yml      dev stack
docker-compose.prod.yml production stack, plus the Cloudflare tunnel
scripts/setup-runner.sh registers this repo's self-hosted Actions runner
.github/workflows/      deploy.yml: test on GitHub, deploy on the self-hosted box
```

## How a request flows

```
browser  ->  localhost:3000  ->  Next rewrite  ->  api:8080  ->  Postgres
```

The browser only ever talks to port 3000. `next.config.mjs` proxies `/api/*` to
the Go service over the compose network, so the session cookie is same-origin
and CORS never applies. The API's CORS config only matters if you call port
8080 directly.

Auth is a bcrypt password hash in Postgres plus a signed JWT in an **httpOnly**
cookie. HttpOnly means JavaScript cannot read the token, which blocks session
theft through XSS. The server stores no sessions: the signature alone proves
the cookie is genuine.

## API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | no | liveness |
| POST | `/api/auth/signup` | no | create account, sets cookie |
| POST | `/api/auth/login` | no | sets cookie |
| POST | `/api/auth/logout` | no | clears cookie |
| GET | `/api/auth/me` | yes | current user |
| POST | `/api/practice/sessions` | yes | save one practice session |
| GET | `/api/practice/summary` | yes | totals, per-note counts, recent sessions, per-item stats |
| PUT | `/api/practice/course` | yes | this learner's course start and target finish |
| GET | `/api/openapi.json` | no | the API described in OpenAPI 3.1 |

**Documentation**: <http://localhost:3000/api-docs> renders the spec, and
`/api/openapi.json` is the machine-readable version for Postman, Insomnia, code
generators or anything else that speaks OpenAPI. The document is hand written and
embedded in the Go binary, and a test compares it with the routing table **in both
directions**, so an endpoint cannot be added, removed or made public without the
documentation following.

Example:

```bash
curl -c jar -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com","password":"your-password"}'

curl -b jar http://localhost:3000/api/practice/summary
```

## Environment

Read from `.env` by compose. See `.env.example`.

| Variable | Default | Notes |
|---|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | yds / yds_dev_pw / yds120 | local dev only |
| `JWT_SECRET` | dev-secret-change-me | **change for anything but local dev**: `openssl rand -base64 48` |
| `CORS_ORIGIN` | http://localhost:3000 | only used for direct calls to port 8080 |
| `COOKIE_SECURE` | false | production sets `true` so the session cookie is HTTPS-only |

## Database

The schema is embedded in the Go binary and applied on every start. Every
statement is `CREATE TABLE IF NOT EXISTS`, so restarting is safe and there is no
migration tool to run.

```bash
docker compose exec db psql -U yds -d yds120        # open a shell
docker compose exec db psql -U yds -d yds120 -c '\dt'
```

Wipe all data and start clean:

```bash
docker compose down -v && docker compose up -d --build
```

`note_stats` holds one running counter per (user, note) rather than every event,
which is what makes the coverage heatmap cheap to read.

## Deployment

Production runs on the same WSL box as the other sites here, behind a Cloudflare
tunnel. Nothing is port-forwarded: `cloudflared` dials out to Cloudflare and
traffic arrives over that connection.

```
browser -> Cloudflare edge -> tunnel (outbound) -> web:3000 -> api:8080 -> db
```

| Hostname | Service |
|---|---|
| `e-saxophone.body-and-binary.net` | `web:3000`, the Next.js app |
| `e-saxophone-api.body-and-binary.net` | `api:8080`, the Go API directly |

The browser normally only ever talks to the first one: Next rewrites `/api/*` to
the Go service over the compose network, so the session cookie is same-origin.
The API hostname exists for callers outside the browser, such as the MCP server.

### One-time setup

**1. Create the tunnel.** In the Cloudflare dashboard, Zero Trust, Networks,
Tunnels, create a **Cloudflared** tunnel. Copy the token it shows. Under Public
Hostnames add the two rows from the table above (`http://web:3000` and
`http://api:8080`) — the container resolves those names on the compose network,
so no IPs or ports are involved. The hostname mapping lives in the dashboard,
not in this repo.

**2. Add the repository secrets** at Settings, Secrets and variables, Actions:

| Secret | How to generate |
|---|---|
| `CLOUDFLARE_TUNNEL_TOKEN` | from step 1 |
| `JWT_SECRET` | `openssl rand -base64 48` |
| `POSTGRES_PASSWORD` | `openssl rand -base64 32` |

`POSTGRES_USER` and `POSTGRES_DB` are optional secrets; the compose file
defaults to `yds` / `yds120`. `WEB_PUBLIC_URL` is an optional repository
*variable* that overrides the CORS origin if the hostname changes.

**3. Register the runner.** Each repo on this box gets its own runner and its
own systemd service. Grab a registration token from
`Settings, Actions, Runners, New self-hosted runner`, then:

```bash
./scripts/setup-runner.sh <registration-token>
```

### Deploying

Every push to `main` runs [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml),
or trigger it by hand from the Actions tab. It runs the tests first, in
throwaway containers against a throwaway database, so a red test stops the
deploy before anything production-facing is touched. Then it builds the new
images while the old containers keep serving, swaps them, and waits for both to
answer before declaring success.

Everything runs on the self-hosted runner. **Do not add a `runs-on:
ubuntu-latest` job**: GitHub-hosted runners are unavailable on this account, so
such a job fails in seconds with *"your account is locked due to a billing
issue"*, and anything with `needs:` pointing at it is skipped rather than run.

By hand on the box:

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f web api
```

The prod stack uses its own compose project name (`e-saxophone-prod`), so its
database volume is separate from the dev one and a `docker compose down -v` in
dev cannot touch it. Only `127.0.0.1:3010` (web) and `127.0.0.1:8090` (api) are
published, for debugging from the box itself; Postgres is not published at all.

### Production differences

- `frontend/Dockerfile.prod` does a real `next build` with `output: 'standalone'`.
  The dev `Dockerfile` skips the build entirely and relies on the bind mount.
  `API_INTERNAL_URL` is a **build arg** there, because `next build` resolves the
  rewrite destination and bakes it in — setting it only at runtime does nothing.
- `COOKIE_SECURE=true` marks the session cookie HTTPS-only.
- Both containers carry the `autoheal` label, so the autoheal container already
  running on this host restarts them if a healthcheck starts failing.

### Tunnel troubleshooting

**Cloudflare 530 / `error code: 1033`** means the tunnel or its origin is down,
not a bug in the app:

```bash
docker compose -f docker-compose.prod.yml logs --tail=50 cloudflare-tunnel
docker compose -f docker-compose.prod.yml restart cloudflare-tunnel
```

**502 from Cloudflare** means the tunnel is connected but the service behind a
public hostname is not answering. Check the hostname points at `http://web:3000`
or `http://api:8080` and that the container is healthy (`... ps`).

## Troubleshooting

**`cannot connect to the Docker daemon`**
Docker Desktop is not running, or WSL integration is off for this distro. Turn
it on at Settings, Resources, WSL Integration, then Apply and Restart.

**"This browser has no Web MIDI support"**
You are in Firefox or Safari. Use Chrome or Edge.

**Connected, but no MIDI input found**
Check the cable is in the USB-to-host port, the instrument is on, and that no
other application has grabbed the MIDI device. Unplugging and replugging is
picked up live, no page reload needed.

**Frontend edits do nothing**
File watching over a WSL bind mount needs polling, which `WATCHPACK_POLLING` in
`docker-compose.yml` enables. If it is still stuck, `docker compose restart web`.

**New npm dependency is missing in the container**
`docker compose exec web npm install`, or rebuild with
`docker compose build web && docker compose up -d web`.

**Everything returns 401**
The cookie expired, or the database was wiped and your account went with it.
Log in again.
