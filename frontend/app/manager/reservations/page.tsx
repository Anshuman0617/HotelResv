"use client";

import { useMemo, useState } from "react";
import ManagerModal from "@/components/manager/ManagerModal";
import { useManagerHotel } from "@/components/manager/ManagerHotelContext";
import {
  managerReservations,
  type ManagerReservation,
  type ReservationStatus,
} from "@/lib/manager/mock";

const pageSize = 5;

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

function getNights(checkIn: string, checkOut: string) {
  const start = new Date(`${checkIn}T00:00:00Z`).getTime();
  const end = new Date(`${checkOut}T00:00:00Z`).getTime();
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

function getTotalAmount(reservation: ManagerReservation) {
  const nights = getNights(reservation.check_in, reservation.check_out);
  return reservation.rooms.reduce(
    (total, room) => total + room.nightly_rate * nights,
    0,
  );
}

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
  const { selectedHotel, hotels } = useManagerHotel();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ReservationStatus>(
    "all",
  );
  const [checkInFrom, setCheckInFrom] = useState("");
  const [checkOutThrough, setCheckOutThrough] = useState("");
  const [page, setPage] = useState(1);
  const [selectedReservation, setSelectedReservation] =
    useState<ManagerReservation | null>(null);

  const filteredReservations = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return managerReservations
      .filter((reservation) => reservation.hotel_id === selectedHotel.id)
      .filter((reservation) => {
        const matchesQuery =
          !normalizedQuery ||
          String(reservation.id).includes(normalizedQuery) ||
          reservation.guest_name.toLocaleLowerCase().includes(normalizedQuery);
        const matchesStatus =
          statusFilter === "all" || reservation.status === statusFilter;
        const matchesCheckIn =
          !checkInFrom || reservation.check_in >= checkInFrom;
        const matchesCheckOut =
          !checkOutThrough || reservation.check_out <= checkOutThrough;
        return (
          matchesQuery && matchesStatus && matchesCheckIn && matchesCheckOut
        );
      })
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
  }, [checkInFrom, checkOutThrough, query, selectedHotel.id, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredReservations.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageReservations = filteredReservations.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const hotelNames = useMemo(
    () => new Map(hotels.map((hotel) => [hotel.id, hotel.name])),
    [hotels],
  );

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
            Review guest stays, booked rooms, and reservation status.
          </p>
        </div>
        <span className="w-fit rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          Mock reservations
        </span>
      </header>

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
            Amounts are calculated from each saved nightly rate and stay length.
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
                    <th className="px-4 py-3 font-medium">Hotel</th>
                    <th className="px-4 py-3 font-medium">Check-in</th>
                    <th className="px-4 py-3 font-medium">Check-out</th>
                    <th className="px-4 py-3 font-medium">Guests</th>
                    <th className="px-4 py-3 font-medium">Rooms</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 text-right font-medium">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageReservations.map((reservation) => (
                    <tr key={reservation.id} className="hover:bg-slate-50/70">
                      <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-900">
                        #{reservation.id}
                      </td>
                      <td className="px-4 py-4">
                        <p className="whitespace-nowrap font-medium text-slate-900">
                          {reservation.guest_name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {reservation.guest_email}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">
                        {hotelNames.get(reservation.hotel_id) ?? "Hotel"}
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
                        {reservation.rooms.length}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right font-medium text-slate-900">
                        {currency.format(getTotalAmount(reservation))}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={reservation.status} />
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
            <p className="font-medium text-slate-900">No reservations found</p>
            <p className="mt-1 text-sm text-slate-500">
              Change the search or filters to see matching bookings.
            </p>
          </div>
        )}
      </section>

      {selectedReservation ? (
        <ManagerModal
          title={`Reservation #${selectedReservation.id}`}
          onClose={() => setSelectedReservation(null)}
        >
          <div className="grid gap-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-900">
                  {selectedReservation.guest_name}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedReservation.guest_email}
                </p>
              </div>
              <StatusBadge status={selectedReservation.status} />
            </div>

            <dl className="grid gap-x-6 gap-y-4 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
              <Detail
                label="Hotel"
                value={
                  hotelNames.get(selectedReservation.hotel_id) ?? "Hotel"
                }
              />
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
                value={`${getNights(selectedReservation.check_in, selectedReservation.check_out)} night(s)`}
              />
              <Detail
                label="Guest count"
                value={String(selectedReservation.guest_count)}
              />
            </dl>

            <div>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">Booked rooms</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Room assignments may be pending.
                  </p>
                </div>
                <span className="text-sm font-medium text-slate-700">
                  {currency.format(getTotalAmount(selectedReservation))}
                </span>
              </div>
              <div className="divide-y divide-slate-200 rounded-lg border border-slate-200">
                {selectedReservation.rooms.map((room) => (
                  <div
                    key={room.id}
                    className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-slate-900">
                        {room.room_type_name}
                        {room.room_number ? ` · Room ${room.room_number}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {room.guest_count} guest(s)
                        {room.room_id === null ? " · Not yet assigned" : ""}
                      </p>
                    </div>
                    <p className="whitespace-nowrap text-sm text-slate-700">
                      {currency.format(room.nightly_rate)} ×{" "}
                      {getNights(
                        selectedReservation.check_in,
                        selectedReservation.check_out,
                      )}{" "}
                      night(s)
                    </p>
                  </div>
                ))}
              </div>
            </div>
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
