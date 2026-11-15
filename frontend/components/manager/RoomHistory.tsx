"use client";

import type { ReactNode } from "react";
import { ErrorNotice, LoadingNotice } from "@/components/manager/LoadState";
import { describeApiError, useApiData } from "@/lib/manager/useApiData";
import type {
  ReservationStatus,
  RoomBookingRow,
  RoomHistory as RoomHistoryData,
} from "@/lib/manager/types";

const statusStyles: Record<ReservationStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  confirmed: "bg-emerald-50 text-emerald-700",
  completed: "bg-slate-100 text-slate-700",
  cancelled: "bg-rose-50 text-rose-700",
};

const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days from today (local date) to an ISO date such as "2026-11-18". */
function daysUntil(isoDate: string): number {
  const [year, month, day] = isoDate.split("-").map(Number);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((Date.UTC(year, month - 1, day) - today) / DAY_MS);
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/**
 * Who stayed in a physical room, who is in it now and who has it booked.
 * Owner and manager only: the API returns 403 for staff.
 */
export default function RoomHistory({
  hotelId,
  roomId,
}: {
  hotelId: number;
  roomId: number;
}) {
  const { data, error, loading, reload } = useApiData<RoomHistoryData>(
    `/api/manager/hotels/${hotelId}/rooms/${roomId}/bookings`,
  );

  if (error) {
    return <ErrorNotice message={describeApiError(error)} onRetry={reload} />;
  }
  if (loading || !data) return <LoadingNotice label="Loading room history…" />;

  const byPeriod = (period: RoomBookingRow["period"]) =>
    data.bookings.filter((booking) => booking.period === period);
  const current = byPeriod("current");
  // The API sorts newest check-in first; upcoming reads better soonest first.
  const upcoming = byPeriod("upcoming").reverse();
  const past = byPeriod("past");
  const cancelled = byPeriod("cancelled");

  return (
    <div className="flex flex-col gap-6">
      <Section title="Currently occupying" empty="Nobody is staying in this room today.">
        {current.map((booking) => {
          const left = daysUntil(booking.check_out);
          return (
            <div
              key={booking.booking_id}
              className="rounded-lg border border-emerald-200 bg-emerald-50 p-4"
            >
              <BookingDetails booking={booking} />
              <p className="mt-2 text-xs font-medium text-emerald-800">
                {left > 0
                  ? `Checks out in ${plural(left, "night")}`
                  : "Checks out today"}
                {booking.customer_phone ? ` · ${booking.customer_phone}` : ""}
              </p>
            </div>
          );
        })}
      </Section>

      <Section title="Upcoming reservations" empty="No upcoming reservations.">
        {upcoming.map((booking) => (
          <Row key={booking.booking_id} booking={booking} />
        ))}
      </Section>

      <Section title="Past stays" empty="No past stays in this room yet.">
        {past.map((booking) => (
          <Row key={booking.booking_id} booking={booking} />
        ))}
      </Section>

      {cancelled.length ? (
        <details className="rounded-lg border border-slate-200">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700">
            Cancelled ({cancelled.length})
          </summary>
          <div className="flex flex-col gap-2 border-t border-slate-200 p-3">
            {cancelled.map((booking) => (
              <Row key={booking.booking_id} booking={booking} />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: ReactNode[];
}) {
  return (
    <section>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
        {children.length ? ` (${children.length})` : ""}
      </h3>
      <div className="mt-2 flex flex-col gap-2">
        {children.length ? (
          children
        ) : (
          <p className="text-sm text-slate-500">{empty}</p>
        )}
      </div>
    </section>
  );
}

function Row({ booking }: { booking: RoomBookingRow }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <BookingDetails booking={booking} />
    </div>
  );
}

function BookingDetails({ booking }: { booking: RoomBookingRow }) {
  return (
    <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="font-medium text-slate-900">{booking.customer_name}</p>
        <p className="truncate text-slate-500">{booking.customer_email}</p>
      </div>
      <div className="text-slate-700 sm:text-right">
        <p>
          {booking.check_in} → {booking.check_out}
        </p>
        <p className="text-xs text-slate-500">
          {plural(booking.nights, "night")} · {plural(booking.guest_count, "guest")} ·{" "}
          {rupees.format(Number(booking.nightly_rate))}/night · #{booking.booking_id}
        </p>
        <span
          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusStyles[booking.booking_status]}`}
        >
          {booking.booking_status}
        </span>
      </div>
    </div>
  );
}
