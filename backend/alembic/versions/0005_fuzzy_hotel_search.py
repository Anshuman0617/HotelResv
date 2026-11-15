"""Fuzzy hotel search: pg_trgm, a generated search column and city aliases.

* Enables the pg_trgm extension (trigram similarity, the % and <% operators).
* Adds hotels.search_text, a STORED generated column holding the lower-cased
  name, city, state, country and description, with a GIN trigram index so a
  typo such as "mumbia" can be matched without scanning every hotel.
* Adds city_aliases for alternative city names (bangalore -> Bengaluru) that
  share too few trigrams with the official name to be found by similarity.

Revision ID: 0005_fuzzy_hotel_search
Revises: 0004_booking_hotel_id
Create Date: 2026-11-15

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005_fuzzy_hotel_search"
down_revision: Union[str, None] = "0004_booking_hotel_id"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Keep in sync with SEARCH_TEXT_SQL in app/models/hotel.py.
SEARCH_TEXT_SQL = (
    "lower(name || ' ' || city || ' ' || coalesce(state, '') || ' ' "
    "|| country || ' ' || coalesce(description, ''))"
)

CITY_ALIASES = [
    ("bangalore", "Bengaluru"),
    ("bombay", "Mumbai"),
    ("madras", "Chennai"),
    ("calcutta", "Kolkata"),
    ("delhi", "New Delhi"),
    ("simla", "Shimla"),
    ("gurgaon", "Gurugram"),
    ("poona", "Pune"),
    ("mysore", "Mysuru"),
    ("mangalore", "Mangaluru"),
    ("cochin", "Kochi"),
    ("trivandrum", "Thiruvananthapuram"),
    ("pondicherry", "Puducherry"),
    ("baroda", "Vadodara"),
    ("benares", "Varanasi"),
    ("banaras", "Varanasi"),
]


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm;")

    op.execute(
        f"ALTER TABLE hotels ADD COLUMN search_text TEXT NOT NULL "
        f"GENERATED ALWAYS AS ({SEARCH_TEXT_SQL}) STORED;"
    )
    op.execute(
        "CREATE INDEX idx_hotels_search_text_trgm "
        "ON hotels USING gin (search_text gin_trgm_ops);"
    )

    aliases = op.create_table(
        "city_aliases",
        sa.Column("alias", sa.String(100), primary_key=True),
        sa.Column("city", sa.String(100), nullable=False),
        sa.CheckConstraint("alias = lower(alias)", name="ck_city_aliases_lowercase"),
    )
    op.bulk_insert(aliases, [{"alias": a, "city": c} for a, c in CITY_ALIASES])


def downgrade() -> None:
    op.drop_table("city_aliases")
    op.drop_index("idx_hotels_search_text_trgm", table_name="hotels")
    op.drop_column("hotels", "search_text")
    # pg_trgm is left installed, like citext: dropping an extension can break
    # other objects that came to depend on it.
