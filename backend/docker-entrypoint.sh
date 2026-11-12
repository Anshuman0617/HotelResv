#!/bin/sh
# Container start-up: bring the schema to head, seed an empty DB, then run the server.
set -e

echo "[entrypoint] Running Alembic migrations..."
alembic upgrade head

python scripts/seed_if_empty.py

echo "[entrypoint] Starting: $*"
exec "$@"
