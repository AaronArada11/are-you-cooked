# Are You Cooked

An AI technical interviewer for programming interview practice. The intended
experience is described in [AGENTS.md](AGENTS.md).

**Status as of October 10, 2026: session recording and the interview frontend are implemented.**
The Next.js/Tailwind/shadcn interface includes a start screen, responsive coding
workspace, evidence-linked session summary, and six steak mascot previews based
on the supplied reference. Sessions retain a timestamped in-memory event record.
Execution, AI interviewing, AI evaluation, and voice are not implemented.
The existing profile/analysis schema contains job-matching and ATS fields from
earlier work; those are not an implementation of the current interviewer goal.

## What exists

- FastAPI application with PostgreSQL 17, SQLAlchemy models, and Alembic migrations.
- `GET /`: basic application response.
- `GET /health/db`: database connectivity check (503 when unavailable).
- `POST /analyses`: create a queued record for an existing profile.
- `GET /analyses/{analysis_id}`: retrieve a record, or return 404.
- UUID validation, 200-character limits for company/job title, transaction
  rollback and safe JSON error responses for database failures.
- Profile-to-analysis relationship with database-level cascading deletion.
- Container startup that waits for PostgreSQL and applies migrations.
- Regression tests using an isolated, disposable PostgreSQL database.

An analysis stays `queued`: no worker or AI service processes it. There is no
profile creation API, authentication, or file upload. The `frontend/`
directory contains the interview interface. API identity comes from a caller-supplied profile UUID;
this is a local development scaffold, not a multi-user deployment.

## Run locally

Requirements: Docker with Docker Compose.

1. If `.env` does not exist, copy `.env.example` to `.env`. Keep existing values
   when reusing an existing database volume. The example credentials are for
   local development only; use URL-safe values for this Compose setup.
2. From the repository root, run:

   ```sh
   docker compose up --build -d
   ```

3. Open [API docs](http://localhost:8000/docs) and
   [database health](http://localhost:8000/health/db).

The API binds to localhost. On startup, it waits for the database health check,
runs `alembic upgrade head`, then starts Uvicorn with development reload.
The built runtime image includes migrations; when running it outside Compose,
run migrations explicitly before serving requests.

To try the legacy analysis endpoints, create an explicitly synthetic profile:

```sh
docker compose exec db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL'
INSERT INTO profiles (id)
VALUES ('00000000-0000-4000-8000-000000000001')
ON CONFLICT (id) DO NOTHING;
SQL

curl -X POST http://localhost:8000/analyses \
  -H 'Content-Type: application/json' \
  -d '{"profile_id":"00000000-0000-4000-8000-000000000001","job_title":"Synthetic practice role"}'
```

Use the returned `id` with `GET /analyses/{analysis_id}`. This checks record
storage only; it does not perform an interview or generate feedback.

`docker compose down` stops the app. Records survive container restarts in the
`postgres_data` volume. Removing that volume deletes the records. Interview messages and code are stored separately in process memory and are lost
on restart or development reload. Voice is not collected.

## Frontend

With Node 22.18+ and the backend running:

```sh
cd frontend
npm ci
npm run dev -- --hostname 127.0.0.1
```

Open [the interview app](http://127.0.0.1:3000). Explore workspace works offline;
Start Interview records a real session through the backend. Code and messages
stay in this browser window until recorded or downloaded. Reloading loses the
local draft and session selection. Backend restarts erase session records.

The frontend proxies only session routes to `INTERVIEW_API_URL` (default
`http://127.0.0.1:8000`). It imports only the versioned public exercise JSON.
Doneness is a clearly labeled visual preview until validated performance
assessment exists. See [frontend setup and checks](frontend/README.md) and
[design decisions](DESIGN.md). No legacy database records or backend behavior
were changed for this interface.

## Architecture

Requests flow through `backend/app/main.py` to `routers/analyses.py`. Pydantic
schemas validate input and serialize ORM output. The database dependency creates
one SQLAlchemy session per request and closes it afterward. Creating an analysis
checks that its profile exists, inserts the record, commits, and refreshes it to
load generated values. PostgreSQL stores the records; Alembic versions the schema.

This retains the existing conventional Python stack. Do not expand the legacy
analysis CRUD into a larger platform before building the small interview flow
specified in AGENTS.md. Decide how to retire or migrate the legacy schema when
the interview session model is implemented; existing records are preserved here.

## Reproduce backend verification

```sh
docker compose -p are-you-cooked-review -f compose.test.yaml up --build --abort-on-container-exit --exit-code-from tests
docker compose -p are-you-cooked-review -f compose.test.yaml down
```

The test stack has its own network and a temporary PostgreSQL filesystem; it
does not mount the development data volume or expose ports. Tests exercise the
actual API and PostgreSQL models, including create/retrieve, missing and invalid
IDs, string length boundaries, cascade deletion, and health checks. Injected
database failures verify rollback and error responses. Migration checks cover
upgrade, downgrade/re-upgrade, model/schema agreement, and URL-encoded credentials
when invoking Alembic from another directory. Tests require a disposable database
whose name ends in `_test`; never point them at development or production data.

The Docker test target installs `backend/requirements-dev.txt`. Direct runtime
dependencies are pinned; transitive dependencies and image digests are not locked.

These checks measure backend behavior only. There is no AI evaluation command,
dataset, or measured AI-quality result yet.

Measured on October 6, 2026: **15 tests passed** against PostgreSQL 17. A separate
fresh-start check without source mounts confirmed that the runtime image applies
both migrations and serves `/`, `/health/db`, and `/openapi.json` successfully.
The test run emits one upstream Starlette deprecation warning about its HTTPX
test client; it does not fail the tests. Development data was not used or modified.

The review fixed overlong fields reaching database errors, unhandled database
lookup errors, missing migrations in the built image, missing startup migration
and readiness ordering, and Alembic failures with encoded credentials or a
different working directory. It also corrected Docker ignore paths and added
setup instructions and the regression suite.

## Next milestone, following AGENTS.md

The full end-to-end interview milestone remains incomplete:

1. Implemented: Author one original Python algorithm exercise with requirements, examples,
   constraints, reference solution, and verified tests.
2. Implemented: enforced session state machine and in-memory event record,
   described below. Actual hint delivery, execution, and assessment remain pending.
3. Implemented: a small code editor, written explanation recording, and factual
   session review. Still pending: an interviewer that asks
   one focused question at a time and keeps hidden tests/reference answers private.
4. Configure a dedicated execution sandbox with resource/output limits, no network,
   and no host files or secrets. The backend Docker container in this repo is
   **not** a candidate-code sandbox. Never run candidate code inside this backend.
5. Generate schema-validated, evidence-linked feedback with validated event IDs,
   bounded retries/timeouts, and explicit insufficient-evidence handling.
6. Add a complete-session end-to-end check and an authored synthetic evaluation
   set, including alternate solutions, incomplete work, requested hints, misleading
   explanations, and evaluator manipulation attempts. Compare final-code-only and
   history-aware feedback with human rubric reviews and held-out examples; report
   only measured quality, latency, and cost.

After that: voice transcription with correction, more curated exercises, and
session replay. Durable interview storage and accounts follow when those workflows
need them; adaptive difficulty and live voice come later.

## Session recording API

Use `/docs` or these requests to try the local recording flow:

```sh
curl http://localhost:8000/exercises/anagram-groups
curl -X POST http://localhost:8000/sessions -H 'Content-Type: application/json' -d '{}'
```

Use the returned UUID as `SESSION_ID`. `GET /sessions/SESSION_ID` returns the
current state, pinned exercise ID/version, and full event record. Send actions to
`POST /sessions/SESSION_ID/events` as JSON:

| State | Action body | Result |
| --- | --- | --- |
| introduction | `{"kind":"message","text":"Are inputs lowercase?"}` | Record candidate message |
| introduction | `{"kind":"start"}` | Move to solving |
| solving | `{"kind":"message","text":"I will group sorted letters."}` | Record explanation |
| solving | `{"kind":"snapshot","code":"# work in progress"}` | Explicit meaningful checkpoint |
| solving | `{"kind":"hint","text":"How should I start?"}` | Record request; delivery unavailable |
| solving | `{"kind":"test_run","code":"# current code"}` | Snapshot and unavailable execution result |
| solving | `{"kind":"submit","code":"# final or incomplete code"}` | Snapshot, submission, move to submitted |
| submitted | `{"kind":"feedback"}` | Record unavailable assessment, move to feedback |
| feedback | `{"kind":"end"}` | Move to ended |

The only state sequence is `introduction → solving → submitted → feedback → ended`.
Skipping, repeating, or reversing a transition returns 409 without changing the
record. Ended sessions are read-only. Invalid action bodies return 422 and missing
sessions/exercises return 404. Empty code is allowed for incomplete attempts.

Recording starts at session creation: the server assigns UTC timestamps and UUIDs
and retains messages, requested hints, explicit code checkpoints, test attempts,
submission, feedback availability, and transitions. Test and submission events
reference their exact code snapshot IDs. No per-keystroke recording is needed.
Requests cannot supply event IDs, timestamps, interviewer roles, or test outcomes.
Only the public exercise specification is exposed.

`app/sessions.py:MemorySessionStore` is the persistence boundary; the session
router uses one instance. Mutations are locked, and returned records are deep
copies. There are no session database writes or migrations. Legacy PostgreSQL
analysis records are untouched. **All interview records disappear on process
restart/reload. Run one worker only.** Storage has no eviction and no account
isolation; this is for local synthetic practice, not shared deployment. Replace
this repository boundary with durable storage when replay/accounts require it.

Hint requests are not delivered hints. Test attempts always report `unavailable`:
no candidate code is executed, even if it looks safe. Feedback similarly reports
`unavailable`, not a grade or an AI review. These explicit placeholders allow the
recording lifecycle to be exercised without fabricating evidence. Future trusted
interviewer, sandbox, and evaluator integrations must supply validated results.

Run the session checks without Docker or PostgreSQL (with dev dependencies installed):

```sh
PYTHONPATH=backend python backend/tests/test_sessions.py
```

