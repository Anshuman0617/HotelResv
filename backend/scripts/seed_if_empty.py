"""Load database/seed.sql only when the users table is empty.

Run by docker-entrypoint.sh after `alembic upgrade head`. Set SEED_ON_START=false
to skip seeding entirely.
"""

import os
import sys
from pathlib import Path

from sqlalchemy import text

ROOT_DIR = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT_DIR / "backend"))
sys.path.insert(0, str(ROOT_DIR))

from app.database import engine  # noqa: E402
from database.seed import SEED_SQL_PATH, apply_seed_to_database  # noqa: E402


def main() -> int:
    if os.getenv("SEED_ON_START", "true").lower() not in {"1", "true", "yes"}:
        print("[seed] SEED_ON_START is off; skipping.")
        return 0

    with engine.connect() as conn:
        user_count = conn.execute(text("SELECT COUNT(*) FROM users")).scalar_one()

    if user_count:
        print(f"[seed] Database already seeded ({user_count} users); skipping.")
        return 0

    print(f"[seed] Empty database; loading {SEED_SQL_PATH} ...")
    return 0 if apply_seed_to_database(SEED_SQL_PATH) else 1


if __name__ == "__main__":
    sys.exit(main())
