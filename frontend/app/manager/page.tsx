"use client";

import Link from "next/link";
import StatCard from "@/components/manager/StatCard";
import { useManagerHotel } from "@/components/manager/ManagerHotelContext";
import { ErrorNotice } from "@/components/manager/LoadState";
import { describeApiError, useApiData } from "@/lib/manager/useApiData";
import type {
  BookingHistoryRow,
  HotelSummaryReport,
  ReservationStatus,
} from "@/lib/manager/types";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const statusStyles: Record<ReservationStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  confirmed: "bg-lagoon-50 text-lagoon-700",
  completed: "bg-lagoon-50 text-lagoon-700",
  cancelled: "bg-sand-100 text-sand-600",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export default function ManagerPage() {
  const { hotels, selectedHotel, rooms, loading: roomsLoading } = useManagerHotel();
  const reportsAllowed = selectedHotel.role !== "staff";
  const base = `/api/manager/hotels/${selectedHotel.id}/reports`;
  const summary = useApiData<HotelSummaryReport>(reportsAllowed ? `${base}/summary` : null);
  const recent = useApiData<BookingHistoryRow[]>(
    reportsAllowed ? `${base}/bookings?limit=5` : null,
  );

  const activeRooms = rooms.filter((room) => room.status === "active").length;
  const dash = "—";
  const reportError = summary.error ?? recent.error;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-sand-900 sm:text-3xl">
          Dashboard
        </h1>
        <p className="text-sm text-sand-600">
          {selectedHotel.name} · {selectedHotel.city}
          <span className="mx-2 text-sand-300">/</span>
          <span className="capitalize">{selectedHotel.status}</span>
          <span className="mx-2 text-sand-300">/</span>
          <span className="capitalize">Your role: {selectedHotel.role}</span>
        </p>
      </div>

      {!reportsAllowed ? (
        <p className="rounded-lg border border-sand-200 bg-white px-4 py-3 text-sm text-sand-600">
          Booking and revenue figures are visible to owners and managers. As
          staff you can manage rooms.
        </p>
      ) : null}
      {reportError ? (
        <ErrorNotice
          message={describeApiError(reportError)}
          onRetry={() => {
            summary.reload();
            recent.reload();
          }}
        />
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total bookings"
          value={summary.data ? String(summary.data.total_bookings) : dash}
          hint="All reservation statuses"
        />
        <StatCard
          label="Total revenue"
          value={summary.data ? currency.format(Number(summary.data.total_revenue)) : dash}
          hint="Successful payments"
        />
        <StatCard
          label="Active rooms"
          value={roomsLoading && !rooms.length ? dash : String(activeRooms)}
          hint={`${rooms.length} physical rooms in total`}
        />
        <StatCard
          label="Your hotels"
          value={String(hotels.length)}
          hint="Hotels you are a member of"
        />
      </section>

      {reportsAllowed ? (
        <section className="overflow-hidden rounded-xl border border-sand-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-sand-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-sand-900">
                Recent reservations
              </h2>
              <p className="mt-1 text-sm text-sand-500">
                Latest bookings for the selected hotel (Query 2).
              </p>
            </div>
            <Link
              href="/manager/reservations"
              className="text-sm font-semibold text-clay-700 hover:text-clay-800"
            >
              View all reservations
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-sand-50 text-xs uppercase tracking-wide text-sand-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Guest</th>
                  <th className="px-5 py-3 font-medium">Stay</th>
                  <th className="px-5 py-3 font-medium">Rooms</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {(recent.data ?? []).map((row) => (
                  <tr key={row.booking_id}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-sand-900">{row.customer_name}</p>
                      <p className="text-xs text-sand-500">#{row.booking_id}</p>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-sand-600">
                      {formatDate(row.check_in)} – {formatDate(row.check_out)}
                    </td>
                    <td className="px-5 py-3 text-sand-600">{row.rooms_booked}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                          statusStyles[row.booking_status] ?? "bg-sand-100 text-sand-600"
                        }`}
                      >
                        {row.booking_status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-sand-900">
                      {currency.format(Number(row.calculated_room_total) || 0)}
                    </td>
                  </tr>
                ))}
                {recent.data && recent.data.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-sand-500">
                      No reservations for this hotel yet.
                    </td>
                  </tr>
                ) : null}
                {recent.loading && !recent.data ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-sand-500">
                      Loading reservations…
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {reportsAllowed ? (
        <section className="flex flex-col gap-3 rounded-xl border border-clay-100 bg-clay-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-sand-900">Explore hotel reports</h2>
            <p className="mt-1 text-sm text-sand-600">
              Monthly revenue, popular room types and hotel ratings, straight
              from the SQL queries.
            </p>
          </div>
          <Link
            href="/manager/reports"
            className="w-fit rounded-md bg-clay-700 px-4 py-2 text-sm font-semibold text-white hover:bg-clay-800"
          >
            View reports
          </Link>
        </section>
      ) : null}
    </div>
  );
}
