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
│   ├── auth-context.tsx            # Signed-in user, login/register/logout
│   ├── types.ts                    # Types matching the database models
│   └── manager/
│       ├── types.ts                # Manager API response types
│       └── useApiData.ts           # Load an API path with loading/error state
└── public/                         # Static assets
```

Every page reads and writes through the backend API; there is no mock data. If
a request fails, the page shows the error instead of sample rows.

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

`/manager` requires sign-in and lists only the hotels the user belongs to
(`GET /api/manager/hotels`). Reports, reservations and payments are visible to
owners and managers; staff can manage rooms.

The manager Reports page shows live results of the three M6 SQL reports in
`../database/queries.sql`:

- **Query 3 – Monthly revenue:** successful payment totals by month for the
  selected hotel. The reporting period controls the chart, rows and total.
- **Query 4 – Popular room types:** confirmed/completed booking counts,
  average booked nightly rate, and room revenue, scoped to the selected hotel.
- **Query 5 – Hotel ratings:** hotels with at least 3 reviews averaging 3.5 or
  more, ranked by average rating. The selected hotel is highlighted, or marked
  as not ranked when it doesn't meet the threshold.

The Reservations page lists the hotel's booking history from Query 2.
