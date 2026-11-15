# Hotel Booking System - DBMS Mid-Sem Project

## 1. Project Overview

The **Hotel Booking System** is a database-driven application designed to simplify hotel discovery, room selection, booking management, and customer reviews. The system aims to support multiple independently registered hotels through a shared database while maintaining secure, hotel-specific access for owners and staff.

This project focuses on relational database design, integrity constraints, normalization, and the integration of a frontend application with a backend API and PostgreSQL database.

**Submission:** DBMS Mid-Sem Evaluation  
**Project Status:** Design and Initial Development

## 2. Objectives

- Design a normalized relational database for hotel and reservation management.
- Model entities, relationships, keys, and constraints using an EER diagram.
- Support hotel discovery, room selection, booking, and payment management.
- Implement secure authentication and role-based access for customers and hotel staff.
- Maintain booking history, payment records, and customer reviews.
- Develop a full-stack application integrated with a relational database.

## 3. Proposed Technology Stack

| Component | Technology |
|---|---|
| Frontend | Next.js |
| Backend | FastAPI |
| Database | PostgreSQL |
| Database Migrations | Alembic |
| API Communication | REST APIs |
| Version Control | Git and GitHub |

## 4. High-Level Architecture

The application follows a three-tier architecture:

```text
        Customer / Hotel Manager
                  |
                  v
          Next.js Frontend
                  |
             REST APIs
                  |
                  v
            FastAPI Backend
                  |
                  v
          PostgreSQL Database
```

- **Frontend:** Provides hotel search, room selection, booking checkout, and customer and manager dashboards.
- **Backend:** Handles authentication, authorization, input validation, booking operations, availability checks, and hotel-level access control.
- **Database:** Stores users, hotels, rooms, bookings, payments, reviews, and related records.
- **Migrations:** Alembic is planned for managing database schema changes.

## 5. Database Design

The proposed relational schema consists of ten tables.

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
- Users and hotels have a many-to-many membership relationship through `hotel_members`.
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

## 6. Proposed Application Workflows

### Workflow 1: Hotel Search and Room Selection

Customers search for hotels by location, browse available room types, compare prices, and select rooms according to guest capacity and stay dates.

### Workflow 2: Booking and Payment

Customers create reservations, request one or more rooms, verify availability, and initiate payment. The system maintains corresponding booking and payment records.

### Workflow 3: Booking Management and Reviews

Customers view their reservations, cancel eligible bookings, and submit ratings and reviews after an eligible completed stay.

## 7. Important Design Considerations

- **Multi-hotel support:** Hotel-owned records are associated with a hotel identifier to support tenant-level access control.
- **Room availability:** Overlapping reservations must be checked transactionally to prevent double-booking of physical rooms.
- **Historical pricing:** The booked nightly rate is preserved independently of future price changes.
- **Authentication security:** Passwords are stored as strong hashes rather than plaintext.
- **Data consistency:** Cross-table relationships, booking status transitions, guest limits, and review eligibility require appropriate validation.
- **Sensitive configuration:** Payment credentials and other secrets must be stored in environment variables.

## 8. Current Progress : Mid-Sem

The following section should reflect the actual state of the repository at submission time.

- [x] Defined the project scope and initial assumptions.
- [x] Prepared the proposed relational schema.
- [x] Identified primary keys, foreign keys, and important integrity constraints.
- [x] Documented entity relationships and normalization decisions.
- [x] Proposed the technology stack and high-level application architecture.
- [x] Identified the major application workflows.
- [ ] Implemented and tested all database tables and constraints.
- [ ] Developed and integrated the frontend and backend.
- [ ] Implemented and tested end-to-end booking workflows.

*Update the checklist above to match the implementation completed by your team before submission.*

## 9. Repository Structure

The repository is expected to follow a structure similar to the following as development progresses:

```text
hotel-booking-system/
├── frontend/               # Next.js application
├── backend/                # FastAPI application
├── database/
│   ├── schema.sql          # Table definitions and constraints
│   ├── seed.sql            # Sample data (planned)
│   └── queries.sql         # SQL queries (planned)
├── migrations/             # Database migrations
├── docs/
│   └── database-design.pdf # EER diagram and schema documentation
└── README.md
```

*The directory structure is illustrative. Update it to match the files actually present in the repository.*

### Run with Docker

The app runs as three containers: `db` (PostgreSQL 16), `backend` (FastAPI) and `frontend` (Next.js). The only requirement is Docker Desktop.

```bash
cp .env.example .env              # optional; every variable has a default
docker compose up --build         # production-style images
```

| Service  | URL / port                                   |
|----------|----------------------------------------------|
| Frontend | http://localhost:3000                        |
| Backend  | http://localhost:8000 (docs at `/docs`)      |
| Database | `localhost:5433` (5433 avoids a local Postgres on 5432) |

On start, the backend runs `alembic upgrade head` and loads `database/seed.sql` (735 rows) if the `users` table is empty. All seeded users log in with their email and the password `secret`, e.g. `aarav.sharma1@example.com` / `secret`. Set `SEED_ON_START=false` to skip seeding.

**Dev mode (hot reload).** Source folders are mounted into the containers, so code changes apply without a rebuild:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Rebuild (`--build`) after changing `requirements.txt` or `package.json`.

**Useful commands**

```bash
docker compose down                             # stop (data is kept)
docker compose down -v                          # stop and wipe the database volume
docker compose logs -f backend                  # follow backend logs
docker compose exec db psql -U postgres hotel_booking
docker compose exec backend pytest -q
```

`NEXT_PUBLIC_API_BASE_URL` is baked into the frontend at build time, and the browser uses it, so it must be a host URL such as `http://localhost:8000`, not `http://backend:8000`.

## 10. Future Work

The planned development work includes:

- Implementing the PostgreSQL schema and database migrations.
- Building REST APIs for hotel search, room availability, bookings, payments, and reviews.
- Developing customer and hotel manager interfaces.
- Enforcing transactional room allocation and preventing overlapping reservations.
- Adding indexes, views, triggers, or other suitable DBMS features.
- Implementing complex SQL queries and reports.
- Testing database constraints and end-to-end application workflows.

## 11. Conclusion

The Hotel Booking System is designed to demonstrate the application of DBMS concepts to a realistic reservation-management problem. The project emphasizes a structured relational schema, data integrity, normalization, transaction safety, and full-stack database integration. The mid-sem deliverable documents the proposed database design, application architecture, workflows, and progress toward a functional system.
