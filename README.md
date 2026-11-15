# Hotel Booking System (HotelResv) – DBMS Project

A multi-hotel reservation and property-management system built on a PostgreSQL database, with a FastAPI backend and a Next.js frontend. CS F212 Database Systems.

## 1. Project Overview

Many independently registered hotels share one relational database. Each hotel's records stay isolated through hotel-level roles, while customers search across all of them, book rooms for specific dates, pay, cancel and review their stays.

The project focuses on relational design and on letting the database itself guarantee correctness: composite foreign keys, check constraints, a trigger, a view, indexes (including a trigram index for fuzzy search), a generated column and row-level locking inside transactions.

**Status:** complete – every workflow below is implemented, migrated, seeded and covered by automated tests.

### Team roles

| Role | Area |
|---|---|
| M1 – Database + Technical Lead | Schema, Alembic migrations, constraints, seed data, indexes, view, trigger, integration |
| M2 – Authentication Backend | Registration, login, password hashing, JWT, hotel-role checks |
| M3 – Hotel + Room Backend | Hotel, room-type and room APIs, availability query, fuzzy search |
| M4 – Booking Backend | Transactional booking, payments, cancellation, completion, reviews |
| M5 – Customer Frontend | Search, hotel details, checkout, booking history |
| M6 – Manager Frontend + Reporting | Manager dashboard, inventory, team, reports, documentation |

## 2. Features

**Customers**
- Fuzzy hotel search that tolerates typos (`mumbia`), word prefixes (`hyder`), several words in any order (`taj mumbai`) and old city names (`bombay`, `bangalore`).
- Live availability for chosen dates and guest count, then multi-room booking at one hotel.
- Simulated payment, booking history, cancellation before check-in (successful payments become refunds), checkout and one review per completed stay.

**Hotel owners, managers and staff** (`/manager`, shown only to hotel members)
- Hotel profile, room types and physical rooms, with room status (active / maintenance / inactive).
- Rooms coloured by tonight's occupancy (occupied / vacant / out of service) and per-room booking history.
- Reservations, payments and reviews for the selected hotel.
- SQL reports: summary view, monthly revenue, popular room types, top-rated hotels, repeat customers.
- Team management: the owner grants, changes or removes `manager` and `staff` roles by email.

## 3. Technology Stack

| Component | Technology |
|---|---|
| Database | PostgreSQL 16 with the `citext` and `pg_trgm` extensions |
| Migrations | Alembic (5 revisions) |
| Backend | FastAPI (async), SQLAlchemy 2 (asyncio), psycopg 3, Pydantic 2 |
| Authentication | JWT (python-jose), bcrypt password hashes |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Tests | pytest against throwaway PostgreSQL schemas |
| Deployment | Docker Compose (db, backend, frontend) |

## 4. Architecture

```text
        Customer / Hotel owner, manager, staff
                         |
                         v
                Next.js frontend (:3000)
                         |   REST + JWT
                         v
                FastAPI backend (:8000)
                         |   SQLAlchemy (async), transactions
                         v
                 PostgreSQL 16 (:5433)
```

- **Frontend:** customer pages (search, hotel details, checkout, bookings) and the manager workspace (dashboard, hotels, team, room types, rooms, reservations, payments, reviews, reports).
- **Backend:** authentication, `require_hotel_role` access checks, validation, transactional booking, and the SQL reports. Routers in `backend/app/routers`, logic in `backend/app/services`.
- **Database:** the single source of truth. Integrity rules live in the schema wherever possible, so they hold even for direct SQL.
- **Migrations:** `backend/alembic/versions` builds the schema from empty (`alembic upgrade head`) and can be rolled back (`alembic downgrade base`).

## 5. Database Design

The schema has ten tables.

| Table | Purpose |
|---|---|
| `users` | Stores user account and authentication information. |
| `hotels` | Stores hotel details, location, status, and registration information. |
| `hotel_members` | Manages hotel membership and staff roles. |
| `city_aliases` | Reference data mapping alternative city names (Bombay, Bangalore) to the official name, for search. |
| `room_types` | Stores room categories, occupancy limits, and base prices. |
| `rooms` | Maintains physical room details and availability status. |
| `bookings` | Stores customer reservations, the hotel they are at, and stay dates. |
| `booking_rooms` | Records requested rooms, room assignments, and booked nightly rates. |
| `payments` | Tracks payment attempts, transaction references, and payment status. |
| `reviews` | Stores customer ratings and feedback for eligible bookings. |

### Key Relationships

- A user can register multiple hotels.
- Users and hotels have a many-to-many membership relationship through `hotel_members`. The user who registers a hotel is its owner, and the owner grants, changes or removes `manager` and `staff` roles (by the member's email) from the manager Team page.
- Each hotel can offer multiple room types and contain multiple physical rooms.
- A user can create multiple bookings.
- Each booking is at exactly one hotel, and every room in it must belong to that hotel.
- A booking can contain multiple requested rooms and have multiple payment records.
- A booking can have at most one review.
- A requested room can be assigned to a physical room when allocation is performed.

### Keys and Integrity Constraints

The database design incorporates:

- **Primary keys** to uniquely identify records.
- **Foreign keys** to maintain referential integrity between related tables.
- **Unique constraints** for fields such as user email and hotel-specific room numbers.
- **Check constraints** for valid date ranges, positive guest counts, non-negative prices, and review ratings between 1 and 5.
- **Not-null constraints** for mandatory attributes.
- **Composite constraints and transactional validation** for cross-table consistency and room allocation.

### Normalization

The schema is normalized table by table against the functional dependencies (FDs) below. Eight of the ten tables are in **BCNF**. `rooms` is in **3NF**, and `booking_rooms` is in **2NF** because of deliberate, constraint-guarded redundancy (see *Controlled denormalization*).

#### Normal forms used

- **1NF** – every attribute holds a single atomic value; no repeating groups.
- **2NF** – 1NF, and no non-key attribute depends on only part of a composite key.
- **3NF** – 2NF, and for every non-trivial FD `X → A`, either `X` is a superkey or `A` is a *prime* attribute (part of some candidate key).
- **BCNF** – for every non-trivial FD `X → A`, `X` is a superkey.

#### Functional dependencies and normal form per table

| Table | Candidate keys | Non-trivial FDs | Highest NF |
|---|---|---|---|
| `users` | `id`, `email` | `id → all`; `email → all` | BCNF |
| `hotels` | `id` | `id → all` | BCNF (see note on addresses) |
| `hotel_members` | `(hotel_id, user_id)` | `(hotel_id, user_id) → role, joined_at` | BCNF |
| `room_types` | `id`, `(hotel_id, name)` | `id → all`; `(hotel_id, name) → all` | BCNF |
| `rooms` | `id`, `(hotel_id, room_number)` | `id → all`; `(hotel_id, room_number) → all`; `room_type_id → hotel_id` | 3NF |
| `bookings` | `id` | `id → all` | BCNF |
| `booking_rooms` | `id` | `id → all`; `booking_id → hotel_id`; `room_type_id → hotel_id`; `room_id → room_type_id, hotel_id` | 2NF |
| `payments` | `id` | `id → all` | BCNF |
| `city_aliases` | `alias` | `alias → city` | BCNF |
| `reviews` | `id`, `booking_id` | `id → all`; `booking_id → all` | BCNF |

**1NF** holds for every table: no attribute stores a list, JSON or comma-separated values. Multi-valued facts live in their own relations: the rooms of a booking in `booking_rooms`, and a hotel's staff in `hotel_members`.

**2NF** holds for every table. The only composite primary key is `hotel_members(hotel_id, user_id)`, and `role` depends on the whole key, because a user can be the owner of one hotel and staff at another.

**`rooms` is 3NF but not BCNF.** `room_type_id → hotel_id` holds because a room type belongs to one hotel, and `room_type_id` is not a superkey of `rooms`, so BCNF fails. 3NF still holds: `hotel_id` is part of the candidate key `(hotel_id, room_number)`, so it is a prime attribute. Removing `hotel_id` from `rooms` would reach BCNF, but `UNIQUE (hotel_id, room_number)` could then no longer be declared, so the database could not stop two rooms in one hotel sharing a number.

**`booking_rooms` is 2NF but not 3NF.** Its only key is `id`, and three FDs pass through non-key attributes: `room_id → room_type_id`, `room_type_id → hotel_id` and `booking_id → hotel_id`. Each is kept on purpose; see below.

**Note on addresses.** In the real world `postal_code → city, state, country`, which would be a transitive dependency in `hotels`. Like most practical designs, the schema treats a hotel's address as one descriptive value and does not split out a postal-code table. Values such as `city = 'Mumbai'` repeating across hotels are not a violation in themselves, since no FD connects them.

#### Controlled denormalization

Each redundant attribute exists for a stated reason, and a constraint ensures its copy can never disagree with its source. That rules out the update anomalies normalization is meant to prevent.

| Attribute | Derivable from | Why it is stored | What keeps it consistent |
|---|---|---|---|
| `rooms.hotel_id` | `room_type_id` | Enables `UNIQUE (hotel_id, room_number)` and direct hotel filters | FK `(room_type_id, hotel_id) → room_types(id, hotel_id)` |
| `booking_rooms.room_type_id` | `room_id` | `room_id` is `NULL` until a physical room is allocated; the requested type must still be recorded | FK `(room_id, room_type_id) → rooms(id, room_type_id)` |
| `booking_rooms.hotel_id` | `booking_id` or `room_type_id` | Lets the database force every room of a booking to be at the booking's hotel | FKs `(booking_id, hotel_id) → bookings(id, hotel_id)` and `(room_type_id, hotel_id) → room_types(id, hotel_id)` |

#### Redundancy across tables

Normal forms are checked one relation at a time, so they do not detect a fact stored in two different tables. The schema has two such cases:

- **`reviews.user_id`, `reviews.hotel_id`** repeat the user and hotel of `reviews.booking_id`. Inside `reviews` they are fine (`booking_id` is a candidate key), but they must agree with `bookings`. The trigger `trg_enforce_review_eligibility` checks this on every insert and update.
- **`bookings.guest_count`** equals the sum of `booking_rooms.guest_count` for that booking. It is kept as a convenient total and is set by the booking service. No database constraint enforces it yet.

#### Values that look redundant but are not

- **`booking_rooms.nightly_rate`** is not determined by `room_types.base_price`. It is a snapshot of the price at booking time, and the two differ once a price changes; this preserves historical totals and revenue.
- **`payments.amount`** is likewise the amount actually charged, not a value derived from the current rates.
- **`hotels.search_text`** is derived from the name, city, state, country and description, but it is a `STORED` generated column: PostgreSQL recomputes it on every write and rejects direct updates, so it cannot become inconsistent. It exists to carry the trigram index used by fuzzy search.
- **`hotels.registered_by`** and the owner row in `hotel_members` record different facts: who registered the hotel, and who currently has owner access. Ownership can change without rewriting history.

### DBMS objects

| Object | Name | Purpose |
|---|---|---|
| View | `hotel_booking_summary` | Per-hotel booking counts by status, revenue and rating from three CTEs; every hotel appears, even with no bookings |
| Trigger | `trg_enforce_review_eligibility` | Before insert/update on `reviews`: the booking exists, belongs to the reviewer, is `completed` and is at the reviewed hotel |
| Generated column | `hotels.search_text` (`STORED`) | Lower-cased name, city, state, country and description for search |
| Indexes | 10 named indexes | Including GIN trigram `idx_hotels_search_text_trgm`, and B-tree indexes on `hotels(city, status)`, `rooms(hotel_id, room_type_id, status)`, `bookings(user_id, check_in)`, `bookings(hotel_id, check_in)` and foreign keys |
| Extensions | `citext`, `pg_trgm` | Case-insensitive emails; trigram similarity (`<%`, `word_similarity`) |
| Locking | `SELECT … FOR UPDATE` in `create_booking` | Locks candidate rooms inside the booking transaction so two customers can't get the same room |

### Seed data

`database/seed.sql` (generated by `database/seed.py`) loads 735 consistent rows; migration `0005` adds 16 city aliases, for **751 rows** in total.

| users | hotels | hotel_members | room_types | rooms | bookings | booking_rooms | payments | reviews | city_aliases |
|---|---|---|---|---|---|---|---|---|---|
| 50 | 10 | 15 | 30 | 100 | 150 | 180 | 140 | 60 | 16 |

## 6. SQL Queries

`database/queries.sql` holds the standalone versions; the backend runs the same SQL with bound parameters.

| # | Purpose | Concepts | Used by |
|---|---|---|---|
| 1 | Available room types for dates and guests | Joins, correlated `NOT EXISTS` overlap check, `GROUP BY`/`HAVING` | Search, hotel page (`hotel_service.py`) |
| 2 | Booking history with rooms, totals, latest payment, rating | CTE, `LEFT JOIN LATERAL`, date arithmetic | Manager reservations (`report_service.py`) |
| 3 | Monthly revenue from successful payments | `DATE_TRUNC`, `TO_CHAR`, `COUNT(DISTINCT)`, `SUM` | Manager reports |
| 4 | Most popular room types | 4-table join, `COUNT`, `AVG`, `SUM`, `LIMIT` | Manager reports |
| 5 | Top-rated hotels (≥ 3 reviews, ≥ 3.5 average) | `AVG`, `MIN`, `MAX`, `HAVING` | Manager reports |
| 6 | Repeat customers with nights and spend | 2 CTEs, `COUNT … FILTER`, `COALESCE(SUM … FILTER)`, `HAVING` | Manager reports |
| – | Fuzzy hotel search | 5 CTEs, `unnest`, `pg_trgm` `<%` / `word_similarity`, `UNION`, window `MAX() OVER` | Search bar (`hotel_service.py`) |

## 7. Application Workflows

1. **Search and availability** – `/` and `/hotels`: ranked fuzzy search over `hotels` and `city_aliases`, then Query 1 counts free rooms per room type for the dates.
2. **Booking and payment** – `/hotels/[id]` → `/checkout`: in one transaction the backend locks candidate `rooms`, checks overlaps, inserts `bookings` (`pending`) and `booking_rooms` with the nightly rate as a snapshot; a successful payment in `payments` sets the booking to `confirmed`.
3. **Manage a booking** – `/bookings`: cancel before check-in (successful payments become `refunded`), complete a stay after check-in night, then leave one review (checked by the trigger).
4. **Run a hotel** – `/manager`: edit inventory and room status, see tonight's occupancy and per-room history, manage the team, and read the SQL reports.

## 8. Design Decisions

- **Multi-hotel isolation:** every hotel-owned row carries `hotel_id`; composite foreign keys keep rooms, room types and booking lines in the same hotel, and every manager endpoint checks the caller's role in `hotel_members`.
- **No double-booking:** stays are half-open intervals `[check_in, check_out)`; only `pending` and `confirmed` bookings hold rooms; candidate rooms are locked with `FOR UPDATE` before the overlap check.
- **Historical pricing:** `booking_rooms.nightly_rate` is copied at booking time, so later price changes don't alter past totals or revenue.
- **Security:** bcrypt password hashes, JWT bearer tokens, all SQL parameterised, secrets in environment variables (`.env`, not committed).
- **Money:** `NUMERIC(12,2)` in INR everywhere.

## 9. Repository Structure

```text
HotelResv/
├── backend/
│   ├── app/
│   │   ├── models/          # 10 SQLAlchemy models
│   │   ├── routers/         # auth, hotels (+ team), booking, manager, reports
│   │   ├── services/        # business logic and report SQL
│   │   ├── schemas/         # Pydantic request/response models
│   │   └── dependencies/    # authentication and hotel-role checks
│   ├── alembic/versions/    # migrations 0001–0005
│   ├── scripts/             # seed_if_empty.py (run on container start)
│   └── tests/               # pytest suite (unit + PostgreSQL)
├── database/
│   ├── schema.sql           # full schema, trigger and city aliases
│   ├── indexes.sql          # named indexes
│   ├── views.sql            # hotel_booking_summary
│   ├── queries.sql          # Queries 1–6
│   ├── seed.py / seed.sql   # deterministic seed data (735 rows)
├── frontend/
│   ├── app/                 # Next.js routes (customer pages + /manager)
│   ├── components/          # UI components (manager/ for the dashboard)
│   ├── lib/                 # API client, auth context, types
│   └── public/images/       # hotel and room photos (Unsplash, see CREDITS.md)
├── docs/                    # database design PDF
├── API_CONTRACTS.md         # every endpoint, access rule and error code
├── DATABASE_SCHEMA.md       # ORM model reference
├── docker-compose.yml       # db, backend, frontend
└── docker-compose.dev.yml   # hot-reload override
```

## 10. Running the Project

### With Docker (recommended)

The app runs as three containers: `db` (PostgreSQL 16), `backend` (FastAPI) and `frontend` (Next.js). The only requirement is Docker Desktop.

```bash
cp .env.example .env              # then set JWT_SECRET_KEY (32+ characters)
docker compose up --build
```

| Service  | URL / port                                   |
|----------|----------------------------------------------|
| Frontend | http://localhost:3000                        |
| Backend  | http://localhost:8000 (docs at `/docs`)      |
| Database | `localhost:5433` (5433 avoids a local Postgres on 5432) |

On start, the backend runs `alembic upgrade head` and loads `database/seed.sql` if the `users` table is empty. Set `SEED_ON_START=false` to skip seeding.

**Demo logins** (every seeded user's password is `secret`):

| Email | Access |
|---|---|
| `aarav.sharma1@example.com` | Owner of hotel 1 (Taj Mahal Palace Suites) |
| `vivaan.verma2@example.com` | Owner of hotel 2, manager of hotel 1 |
| `aditya.patel3@example.com` | Owner of hotel 3, manager of hotel 2 |
| `ananya.sharma11@example.com` | Customer with several bookings |

**Dev mode (hot reload).** Source folders are mounted into the containers, so code changes apply without a rebuild:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Rebuild (`--build`) after changing `requirements.txt` or `package.json`, and after pulling new code.

**Useful commands**

```bash
docker compose down                             # stop (data is kept)
docker compose down -v                          # stop and wipe the database volume
docker compose logs -f backend                  # follow backend logs
docker compose exec db psql -U postgres hotel_booking
docker compose exec backend pytest -q
```

`NEXT_PUBLIC_API_BASE_URL` is baked into the frontend at build time, and the browser uses it, so it must be a host URL such as `http://localhost:8000`, not `http://backend:8000`.

### Without Docker

```bash
# Backend (needs a local PostgreSQL 16 and DATABASE_URL / JWT_SECRET_KEY in .env)
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
python scripts/seed_if_empty.py
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

### Tests

```bash
cd backend
createdb hotelresv_test
TEST_DATABASE_URL=postgresql+psycopg://localhost/hotelresv_test pytest -q   # JWT_SECRET_KEY must be set (.env or environment)
```

The PostgreSQL tests build their tables in a throwaway schema and drop it afterwards; without `TEST_DATABASE_URL` they are skipped and only the unit tests run. The full suite has 77 tests.

## 11. Limitations and Future Work

- **Payments are simulated:** the client chooses the outcome; a real gateway would confirm it through a webhook.
- **Unpaid bookings never expire:** `pending` bookings keep holding rooms; a timeout job should release them.
- **No platform administrator:** new hotels are active immediately, and approving or suspending hotels has no separate role.
- **Overlap rule enforced in the application:** a PostgreSQL exclusion constraint (`btree_gist` on a date range) would let the database itself reject double-bookings.
- **`bookings.guest_count`** is a stored total of its booking lines that no constraint keeps in sync.
- **Dates use the server's clock,** not each hotel's `timezone`.

## 12. Conclusion

HotelResv applies DBMS concepts to a realistic reservation problem: a schema normalized to BCNF where possible and deliberately denormalized only where constraints guard the copies, integrity enforced by composite keys, checks and a trigger, reporting through a view and analytical SQL, typo-tolerant search with trigram indexes, and transactional booking with row-level locking, all behind a working full-stack application.
