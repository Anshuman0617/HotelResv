"""Add google_id to users and make password_hash nullable for Google OAuth.

Revision ID: 0002_google_oauth
Revises: 0001_initial_schema
Create Date: 2026-11-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0002_google_oauth"
down_revision: Union[str, None] = "0001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add google_id column (nullable, unique)
    op.execute(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;"
    )
    # Make password_hash nullable (OAuth users won't have a password)
    op.execute(
        "ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;"
    )


def downgrade() -> None:
    # Remove google_id column
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS google_id;")
    # Restore NOT NULL on password_hash
    op.execute(
        "ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;"
    )
