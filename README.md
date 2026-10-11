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

The proposed relational schema consists of nine tables.

| Table | Purpose |
|---|---|
| `users` | Stores user account and authentication information. |
| `hotels` | Stores hotel details, location, status, and registration information. |
| `hotel_members` | Manages hotel membership and staff roles. |
| `room_types` | Stores room categories, occupancy limits, and base prices. |
| `rooms` | Maintains physical room details and availability status. |
| `bookings` | Stores customer reservations and stay dates. |
| `booking_rooms` | Records requested rooms, room assignments, and booked nightly rates. |
| `payments` | Tracks payment attempts, transaction references, and payment status. |
| `reviews` | Stores customer ratings and feedback for eligible bookings. |

### Key Relationships

- A user can register multiple hotels.
- Users and hotels have a many-to-many membership relationship through `hotel_members`.
- Each hotel can offer multiple room types and contain multiple physical rooms.
- A user can create multiple bookings.
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

The schema is designed to approximately satisfy **Third Normal Form (3NF)** by separating users, hotels, room types, physical rooms, bookings, payments, and reviews into distinct relations.

The `hotel_members` table resolves the many-to-many relationship between users and hotels, while `booking_rooms` allows a booking to include multiple requested rooms. The booked nightly rate is stored as a snapshot to preserve historical pricing when a room type's base price changes.

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
