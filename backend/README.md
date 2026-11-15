# Backend - FastAPI

Planned REST API for authentication, hotel and room
management, booking operations, availability checks,
payments, and reviews.

Status: Proposed; implementation pending.

## API reference

Endpoint contracts (bookings, payments, reviews and manager reports) are in
[`API_CONTRACTS.md`](../API_CONTRACTS.md).

## Concurrency and scaling

The API is fully asynchronous: every endpoint, dependency and service is
`async def` and talks to PostgreSQL through SQLAlchemy's `AsyncSession`
(`app/database.py`). psycopg 3 provides async I/O on the same
`postgresql+psycopg://` URL. While a request waits on the database, its worker
serves other requests instead of holding a thread.

**Writing new code**

- Endpoints and services are `async def` and take `db: AsyncSession = Depends(get_db)`.
- Await every database call: `await db.scalar(...)`, `(await db.scalars(q)).all()`,
  `(await db.execute(q)).mappings().all()`, `await db.commit()`. `db.add(...)` is not awaited.
- Load relationships explicitly (`selectinload(...)`). Lazy loading raises
  `MissingGreenlet` in async code. Sessions use `expire_on_commit=False`, so
  objects stay readable after a commit.
- Don't call blocking or CPU-heavy code directly in an `async def`. Wrap it in
  `await run_in_threadpool(func, ...)` from `fastapi.concurrency`, as
  `auth_service` does for bcrypt.
- Alembic and `scripts/seed_if_empty.py` stay synchronous; they run once at start-up.

**Workers and connection pool** (set in `.env` or the environment)

| Setting | Default | Meaning |
|---|---|---|
| `WEB_CONCURRENCY` | 4 in Docker, 1 with the dev override | uvicorn worker processes |
| `DB_POOL_SIZE` | 5 | connections each worker keeps open |
| `DB_MAX_OVERFLOW` | 5 | extra connections a worker may open under load |
| `DB_POOL_TIMEOUT` | 30 | seconds a request waits for a free connection |

Each worker has its own pool, so keep
`WEB_CONCURRENCY × (DB_POOL_SIZE + DB_MAX_OVERFLOW)` below PostgreSQL's
`max_connections` (100 by default). The defaults use at most 40 connections.

**Tests** run against the async app. The Postgres tests override `get_db` with an
async session on a `NullPool` engine. The SQLite tests use `aiosqlite` with
anyio's pytest plugin (`pytestmark = pytest.mark.anyio`).
