"use client";

import { useMemo, useState } from "react";
import ManagerModal from "@/components/manager/ManagerModal";
import { useManagerHotel } from "@/components/manager/ManagerHotelContext";
import { ErrorNotice } from "@/components/manager/LoadState";
import { describeApiError, useApiData } from "@/lib/manager/useApiData";
import type {
  BookingHistoryRow,
  ReservationStatus,
} from "@/lib/manager/types";

const pageSize = 10;
/** The bookings report allows at most 100 rows per request. */
const fetchLimit = 100;

const statusStyles: Record<ReservationStatus, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  confirmed: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  cancelled: "bg-slate-100 text-slate-600 ring-slate-500/20",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default function ManagerReservationsPage() {
  const { selectedHotel } = useManagerHotel();
  const reportsAllowed = selectedHotel.role !== "staff";
  const bookings = useApiData<BookingHistoryRow[]>(
    reportsAllowed
      ? `/api/manager/hotels/${selectedHotel.id}/reports/bookings?limit=${fetchLimit}`
      : null,
  );
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ReservationStatus>(
    "all",
  );
  const [checkInFrom, setCheckInFrom] = useState("");
  const [checkOutThrough, setCheckOutThrough] = useState("");
  const [page, setPage] = useState(1);
  const [selectedReservation, setSelectedReservation] =
    useState<BookingHistoryRow | null>(null);

  const filteredReservations = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return (bookings.data ?? [])
      .filter((reservation) => {
        const matchesQuery =
          !normalizedQuery ||
          String(reservation.booking_id).includes(normalizedQuery) ||
          reservation.customer_name.toLocaleLowerCase().includes(normalizedQuery);
        const matchesStatus =
          statusFilter === "all" || reservation.booking_status === statusFilter;
        const matchesCheckIn =
          !checkInFrom || reservation.check_in >= checkInFrom;
        const matchesCheckOut =
          !checkOutThrough || reservation.check_out <= checkOutThrough;
        return (
          matchesQuery && matchesStatus && matchesCheckIn && matchesCheckOut
        );
      })
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
  }, [bookings.data, checkInFrom, checkOutThrough, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredReservations.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageReservations = filteredReservations.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const reachedLimit = (bookings.data?.length ?? 0) >= fetchLimit;

  function resetPageAnd(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-indigo-700">
            {selectedHotel.name}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Reservations
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Booking history for this hotel from Query 2: guests, stays,
            totals, payment and review status.
          </p>
        </div>
      </header>

      {!reportsAllowed ? (
        <p className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          Reservations include guest contact details, so only owners and
          managers can see them.
        </p>
      ) : null}
      {bookings.error ? (
        <ErrorNotice
          message={describeApiError(bookings.error)}
          onRetry={bookings.reload}
        />
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Search booking or guest
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Booking ID or guest name"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal normal-case text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Booking status
            <select
              value={statusFilter}
              onChange={(event) => {
                const value = event.target.value;
                if (
                  value === "all" ||
                  value === "pending" ||
                  value === "confirmed" ||
                  value === "cancelled" ||
                  value === "completed"
                ) {
                  setStatusFilter(value);
                  setPage(1);
                }
              }}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal normal-case text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Check-in from
            <input
              type="date"
              value={checkInFrom}
              onChange={(event) =>
                resetPageAnd(setCheckInFrom, event.target.value)
              }
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal normal-case text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Check-out through
            <input
              type="date"
              value={checkOutThrough}
              onChange={(event) =>
                resetPageAnd(setCheckOutThrough, event.target.value)
              }
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal normal-case text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-1 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Booking list</h2>
            <p className="mt-1 text-sm text-slate-500">
              {filteredReservations.length} reservation
              {filteredReservations.length === 1 ? "" : "s"} for {selectedHotel.name}
            </p>
          </div>
          <p className="text-xs text-slate-500">
            {reachedLimit
              ? `Showing the latest ${fetchLimit} bookings. `
              : ""}
            Totals use each booked nightly rate × nights.
          </p>
        </div>
        {pageReservations.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Booking</th>
                    <th className="px-4 py-3 font-medium">Guest</th>
                    <th className="px-4 py-3 font-medium">Check-in</th>
                    <th className="px-4 py-3 font-medium">Check-out</th>
                    <th className="px-4 py-3 font-medium">Guests</th>
                    <th className="px-4 py-3 font-medium">Rooms</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Payment</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 text-right font-medium">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageReservations.map((reservation) => (
                    <tr key={reservation.booking_id} className="hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-900">
                        #{reservation.booking_id}
                      </td>
                      <td className="px-4 py-4">
                        <p className="whitespace-nowrap font-medium text-slate-900">
                          {reservation.customer_name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {reservation.customer_email}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">
                        {formatDate(reservation.check_in)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">
                        {formatDate(reservation.check_out)}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {reservation.guest_count}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {reservation.rooms_booked}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right font-medium text-slate-900">
                        {currency.format(Number(reservation.calculated_room_total))}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={reservation.booking_status} />
                      </td>
                      <td className="px-4 py-4 capitalize text-slate-700">
                        {reservation.latest_payment_status}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                        {formatCreatedAt(reservation.created_at)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedReservation(reservation)}
                          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Showing {(currentPage - 1) * pageSize + 1}–
                {Math.min(currentPage * pageSize, filteredReservations.length)}{" "}
                of {filteredReservations.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setPage(currentPage - 1)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="min-w-20 text-center text-sm text-slate-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setPage(currentPage + 1)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="px-5 py-12 text-center">
            <p className="font-medium text-slate-900">
              {bookings.loading && !bookings.data
                ? "Loading reservations…"
                : "No reservations found"}
            </p>
            {bookings.data?.length ? (
              <p className="mt-1 text-sm text-slate-500">
                Change the search or filters to see matching bookings.
              </p>
            ) : null}
          </div>
        )}
      </section>

      {selectedReservation ? (
        <ManagerModal
          title={`Reservation #${selectedReservation.booking_id}`}
          onClose={() => setSelectedReservation(null)}
        >
          <div className="grid gap-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-900">
                  {selectedReservation.customer_name}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedReservation.customer_email}
                </p>
              </div>
              <StatusBadge status={selectedReservation.booking_status} />
            </div>

            <dl className="grid gap-x-6 gap-y-4 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
              <Detail label="Hotel" value={selectedReservation.hotel_name} />
              <Detail
                label="Booking created"
                value={formatCreatedAt(selectedReservation.created_at)}
              />
              <Detail
                label="Check-in"
                value={formatDate(selectedReservation.check_in)}
              />
              <Detail
                label="Check-out"
                value={formatDate(selectedReservation.check_out)}
              />
              <Detail
                label="Stay length"
                value={`${selectedReservation.nights} night(s)`}
              />
              <Detail
                label="Guest count"
                value={String(selectedReservation.guest_count)}
              />
            </dl>

            <dl className="grid gap-x-6 gap-y-4 rounded-lg border border-slate-200 p-4 sm:grid-cols-2">
              <Detail
                label="Rooms booked"
                value={String(selectedReservation.rooms_booked)}
              />
              <Detail
                label="Room total"
                value={currency.format(Number(selectedReservation.calculated_room_total))}
              />
              <Detail
                label="Latest payment"
                value={selectedReservation.latest_payment_status}
              />
              <Detail
                label="Review"
                value={
                  selectedReservation.review_rating === null
                    ? "Not reviewed"
                    : `${selectedReservation.review_rating} / 5`
                }
              />
            </dl>
          </div>
        </ManagerModal>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: ReservationStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${statusStyles[status]}`}
    >
      {status}
    </span>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-slate-800">{value}</dd>
    </div>
  );
}
