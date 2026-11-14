# HotelResv Frontend

Next.js (App Router) + TypeScript + Tailwind CSS frontend for the Hotel Booking
System.

## Requirements

- Node.js 20+
- npm

## Setup

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000). The backend API
is expected at `http://localhost:8000` unless `NEXT_PUBLIC_API_BASE_URL` is set.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm run start` | Run the production build |
| `npm run lint` | Run ESLint |

## Folder structure

```text
frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          # Customer login (M5)
│   │   └── register/page.tsx       # Customer registration (M5)
│   ├── hotels/
│   │   ├── page.tsx                # Hotel listing and search (M5)
│   │   └── [id]/page.tsx           # Hotel details and room types (M5)
│   ├── bookings/page.tsx           # Customer booking history (M5)
│   ├── checkout/page.tsx           # Checkout and payment (M5)
│   ├── manager/
│   │   ├── page.tsx                # Manager dashboard (M6)
│   │   ├── hotels/page.tsx         # Hotel profile management (M6)
│   │   ├── room-types/page.tsx     # Room type management (M6)
│   │   ├── rooms/page.tsx          # Physical room management (M6)
│   │   └── reports/page.tsx        # Manager reports (M6)
│   ├── globals.css                 # Tailwind entry and theme tokens
│   ├── layout.tsx                  # Root layout with shared Navbar
│   └── page.tsx                    # Landing page with search
├── components/                     # Shared UI components
│   ├── Navbar.tsx                  # Top navigation
│   ├── SearchBar.tsx               # City, dates, and guests search
│   ├── HotelCard.tsx               # Hotel summary card
│   ├── RoomCard.tsx                # Room type card
│   ├── BookingCard.tsx             # Booking summary card
│   └── manager/                    # Manager navigation, context and UI
├── lib/
│   ├── api.ts                      # API base URL, response envelope, fetch helper
│   ├── types.ts                    # Types matching the database models
│   └── manager/mock.ts             # Schema-aligned manager sample data
└── public/                         # Static assets
```

Pages currently contain placeholders. Login, registration, hotel search, room
selection, checkout, booking history, cancellation, and reviews will be wired to
the backend in the next M5 task.

## API conventions

All backend responses use the shared envelope:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {}
}
```

`lib/api.ts` provides `apiFetch<T>()`, which prepends `NEXT_PUBLIC_API_BASE_URL`,
sets the `Authorization: Bearer <token>` header when a token is stored in
`localStorage`, and throws `ApiError` for failed responses.

## Ownership

- **M5** – customer pages and shared components.
- **M6** – manager dashboard, hotel/room inventory, reservations, and reports under `app/manager/`.

## Manager reports (Day 4 / M6)

The manager Reports page previews the three M6 SQL reports in
`../database/queries.sql`:

- **Query 3 – Monthly revenue:** successful payment totals by month and hotel.
  The selected hotel and reporting period control the chart, rows, and period
  total.
- **Query 4 – Popular room types:** confirmed/completed booking counts,
  average booked nightly rate, and room revenue, scoped to the selected hotel.
- **Query 5 – Hotel ratings:** hotels ranked by average rating and review count.
  The selected hotel is highlighted; hotels without reviews are not assigned a
  fabricated rating and are excluded from the query's ranking.

The figures are labelled **mock previews** from
`lib/manager/mock.ts`. SQL execution against PostgreSQL was not available during
implementation, and the page does not claim live database results. Backend/API
integration, database connectivity, and wiring the query result adapters remain
dependencies for live reports.
