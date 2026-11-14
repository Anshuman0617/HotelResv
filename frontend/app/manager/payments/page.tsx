"use client";

import { useMemo, useState } from "react";
import ManagerModal from "@/components/manager/ManagerModal";
import { useManagerHotel } from "@/components/manager/ManagerHotelContext";
import {
  managerPayments,
  type ManagerPayment,
  type PaymentStatus,
} from "@/lib/manager/mock";

const pageSize = 6;

const statusStyles: Record<PaymentStatus, string> = {
  successful: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  failed: "bg-rose-50 text-rose-700 ring-rose-600/20",
  refunded: "bg-slate-100 text-slate-600 ring-slate-500/20",
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

export default function ManagerPaymentsPage() {
  const { hotels, selectedHotel, setSelectedHotelId } = useManagerHotel();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PaymentStatus>(
    "all",
  );
  const [page, setPage] = useState(1);
  const [selectedPayment, setSelectedPayment] =
    useState<ManagerPayment | null>(null);

  const filteredPayments = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return managerPayments
      .filter((payment) => payment.hotel_id === selectedHotel.id)
      .filter((payment) => {
        const matchesQuery =
          !normalizedQuery ||
          payment.id.toLocaleLowerCase().includes(normalizedQuery) ||
          String(payment.reservation_id).includes(normalizedQuery) ||
          payment.guest_name.toLocaleLowerCase().includes(normalizedQuery);
        const matchesStatus =
          statusFilter === "all" || payment.status === statusFilter;
        return matchesQuery && matchesStatus;
      })
      .sort((left, right) =>
        right.payment_date.localeCompare(left.payment_date),
      );
  }, [query, selectedHotel.id, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagePayments = filteredPayments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-indigo-700">
            {selectedHotel.name}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Payments
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Review payment records associated with reservations at this hotel.
          </p>
        </div>
        <span className="w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
          Mock preview · No payments processed
        </span>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Search payment, booking, or guest
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Payment ID, booking ID, or guest"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal normal-case text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Payment status
            <select
              value={statusFilter}
              onChange={(event) => {
                const value = event.target.value;
                if (
                  value === "all" ||
                  value === "successful" ||
                  value === "pending" ||
                  value === "failed" ||
                  value === "refunded"
                ) {
                  setStatusFilter(value);
                  setPage(1);
                }
              }}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal normal-case text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="all">All statuses</option>
              <option value="successful">Successful</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 sm:col-span-2">
            Hotel
            <select
              value={selectedHotel.id}
              onChange={(event) => {
                setSelectedHotelId(Number(event.target.value));
                setPage(1);
              }}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal normal-case text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              {hotels.map((hotel) => (
                <option key={hotel.id} value={hotel.id}>
                  {hotel.name} · {hotel.city}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-1 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Payment records</h2>
            <p className="mt-1 text-sm text-slate-500">
              {filteredPayments.length} payment
              {filteredPayments.length === 1 ? "" : "s"} for {selectedHotel.name}
            </p>
          </div>
          <span className="text-xs text-slate-500">
            Select a row to view its preview details
          </span>
        </div>

        {pagePayments.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Payment ID</th>
                    <th className="px-4 py-3 font-medium">Booking ID</th>
                    <th className="px-4 py-3 font-medium">Guest</th>
                    <th className="px-4 py-3 font-medium">Hotel</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Method</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Payment date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pagePayments.map((payment) => (
                    <tr
                      key={payment.id}
                      tabIndex={0}
                      onClick={() => setSelectedPayment(payment)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedPayment(payment);
                        }
                      }}
                      className="cursor-pointer hover:bg-slate-50/70 focus:bg-slate-50 focus:outline-none"
                      aria-label={`View payment ${payment.id}`}
                    >
                      <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-900">
                        {payment.id}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">
                        #{payment.reservation_id}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 font-medium text-slate-900">
                        {payment.guest_name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">
                        {selectedHotel.name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-right font-medium text-slate-900">
                        {currency.format(payment.amount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">
                        {payment.method}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={payment.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                        {formatDate(payment.payment_date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Showing {(currentPage - 1) * pageSize + 1}–
                {Math.min(currentPage * pageSize, filteredPayments.length)} of{" "}
                {filteredPayments.length}
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
            <p className="font-medium text-slate-900">No payments found</p>
            <p className="mt-1 text-sm text-slate-500">
              Change the search or filters to see matching payment previews.
            </p>
          </div>
        )}
      </section>

      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        These illustrative payment records are mock fixtures only. They are not
        live transaction data, and no payment has been processed or verified.
      </p>

      {selectedPayment ? (
        <ManagerModal
          title={`Payment ${selectedPayment.id}`}
          onClose={() => setSelectedPayment(null)}
        >
          <div className="grid gap-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-900">
                  {currency.format(selectedPayment.amount)}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Reservation #{selectedPayment.reservation_id}
                </p>
              </div>
              <StatusBadge status={selectedPayment.status} />
            </div>
            <dl className="grid gap-x-6 gap-y-4 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
              <Detail label="Guest" value={selectedPayment.guest_name} />
              <Detail label="Hotel" value={selectedHotel.name} />
              <Detail label="Payment method" value={selectedPayment.method} />
              <Detail
                label="Payment date"
                value={formatDate(selectedPayment.payment_date)}
              />
            </dl>
            <p className="text-xs leading-5 text-slate-500">
              Preview fixture only; this record does not confirm that a
              transaction was processed.
            </p>
          </div>
        </ManagerModal>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusStyles[status]}`}
    >
      {label}
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
