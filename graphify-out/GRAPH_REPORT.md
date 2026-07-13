# Graph Report - /Users/aaronarada/Code/Projects/are-you-cooked  (2026-07-12)

## Corpus Check
- Corpus is ~409 words - fits in a single context window. You may not need a graph.

## Summary
- 29 nodes · 27 edges · 7 communities (6 shown, 1 thin omitted)
- Extraction: 85% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Backend Runtime
- Alembic Migration Runtime
- Database Session Layer
- PostgreSQL Container Stack
- FastAPI Routes and Health
- Persistence Dependencies

## God Nodes (most connected - your core abstractions)
1. `Database Service` - 4 edges
2. `PostgreSQL Psycopg Database URL` - 4 edges
3. `Backend Service` - 3 edges
4. `Uvicorn Development Server` - 3 edges
5. `run_migrations_offline()` - 2 edges
6. `run_migrations_online()` - 2 edges
7. `Base` - 2 edges
8. `get_db_session()` - 2 edges
9. `database_health()` - 2 edges
10. `SQLAlchemy 2.0.51` - 2 edges

## Surprising Connections (you probably didn't know these)
- `Uvicorn Development Server` --semantically_similar_to--> `Uvicorn with Standard Extras`  [INFERRED] [semantically similar]
  compose.yaml → backend/requirements.txt
- `app.main:app ASGI Application` --conceptually_related_to--> `FastAPI`  [INFERRED]
  compose.yaml → backend/requirements.txt
- `PostgreSQL Psycopg Database URL` --references--> `Psycopg Binary 3.3.4`  [EXTRACTED]
  compose.yaml → backend/requirements.txt

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Backend PostgreSQL Persistence Stack** — compose_backend_service, compose_database_url, compose_db_service, compose_postgres_17, compose_postgres_data, backend_requirements_psycopg_binary, backend_requirements_sqlalchemy, backend_requirements_alembic [INFERRED 0.85]

## Communities (7 total, 1 thin omitted)

### Community 0 - "Backend Runtime"
Cohesion: 0.33
Nodes (6): FastAPI, Uvicorn with Standard Extras, app.main:app ASGI Application, Backend Source Bind Mount, Backend Service, Uvicorn Development Server

### Community 1 - "Alembic Migration Runtime"
Cohesion: 0.40
Nodes (4): Run migrations in 'offline' mode.      This configures the context with just a U, Run migrations in 'online' mode.      In this scenario we need to create an Engi, run_migrations_offline(), run_migrations_online()

### Community 2 - "Database Session Layer"
Cohesion: 0.40
Nodes (4): Base, get_db_session(), DeclarativeBase, Session

### Community 3 - "PostgreSQL Container Stack"
Cohesion: 0.50
Nodes (5): PostgreSQL Psycopg Database URL, Database Service, PostgreSQL 17 Image, PostgreSQL Data Volume, PostgreSQL Environment Configuration

### Community 5 - "Persistence Dependencies"
Cohesion: 0.67
Nodes (3): Alembic 1.18.5, Psycopg Binary 3.3.4, SQLAlchemy 2.0.51

## Knowledge Gaps
- **6 isolated node(s):** `FastAPI`, `Uvicorn with Standard Extras`, `Alembic 1.18.5`, `PostgreSQL 17 Image`, `Backend Source Bind Mount` (+1 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PostgreSQL Psycopg Database URL` connect `PostgreSQL Container Stack` to `Backend Runtime`, `Persistence Dependencies`?**
  _High betweenness centrality (0.143) - this node is a cross-community bridge._
- **Why does `Backend Service` connect `Backend Runtime` to `PostgreSQL Container Stack`?**
  _High betweenness centrality (0.116) - this node is a cross-community bridge._
- **What connects `FastAPI`, `Uvicorn with Standard Extras`, `Alembic 1.18.5` to the rest of the system?**
  _6 weakly-connected nodes found - possible documentation gaps or missing edges._