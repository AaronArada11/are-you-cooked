# Are You Cooked

An AI technical interviewer for programming interview practice. The intended
experience is described in [AGENTS.md](AGENTS.md).

**Status as of October 6, 2026: backend foundation only.** There is no usable
interview session or AI integration yet. The last feature commit before this
review was `45a77cc` (August 4, 2026), adding analysis creation and retrieval.
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
profile creation API, authentication, frontend, or file upload. The `frontend/`
directory is empty. API identity comes from a caller-supplied profile UUID;
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
`postgres_data` volume. Removing that volume deletes the records. No interview
messages, code submissions, or voice recordings are collected yet.

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

None of the end-to-end interview milestone is complete yet:

1. Author one original Python algorithm exercise with requirements, examples,
   constraints, reference solution, and verified tests.
2. Add the `introduction → solving → submitted → feedback → ended` state machine,
   enforcing transitions in code. Store timestamped messages, meaningful code
   snapshots, hints, test runs, submission, and the problem version. Start with a
   clear local/in-memory persistence boundary.
3. Build a small code editor and text conversation. Add an interviewer that asks
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
