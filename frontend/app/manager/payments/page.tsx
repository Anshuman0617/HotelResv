"use client";

import { useMemo, useState } from "react";
import { useManagerHotel } from "@/components/manager/ManagerHotelContext";
import { ErrorNotice } from "@/components/manager/LoadState";
import { describeApiError, useApiData } from "@/lib/manager/useApiData";
import StatCard from "@/components/manager/StatCard";

interface PaymentRow {
  payment_id: number;
  booking_id: number;
  customer_name: string;
  amount: number;
  currency: string;
  payment_status: "successful" | "refunded" | "failed" | "initiated";
  provider: string;
  created_at: string;
  paid_at: string | null;
}

const currencyFormat = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const statusStyles: Record<string, string> = {
  successful: "bg-lagoon-50 text-lagoon-700 ring-lagoon-600/20",
  refunded: "bg-amber-50 text-amber-700 ring-amber-600/20",
  failed: "bg-rose-50 text-rose-700 ring-rose-600/20",
  initiated: "bg-sand-100 text-sand-700 ring-sand-500/20",
};

function formatDateTime(value: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function ManagerPaymentsPage() {
  const { selectedHotel } = useManagerHotel();
  const reportsAllowed = selectedHotel.role !== "staff";
  const request = useApiData<PaymentRow[]>(
    reportsAllowed
      ? `/api/manager/hotels/${selectedHotel.id}/reports/payments`
      : null,
  );
  const payments = useMemo(() => request.data ?? [], [request.data]);
  const loading = request.loading && !request.data;
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchesStatus =
        statusFilter === "all" || p.payment_status === statusFilter;
      const matchesSearch =
        searchQuery === "" ||
        p.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(p.booking_id).includes(searchQuery) ||
        String(p.payment_id).includes(searchQuery);
      return matchesStatus && matchesSearch;
    });
  }, [payments, statusFilter, searchQuery]);

  const metrics = useMemo(() => {
    const totalRevenue = payments
      .filter((p) => p.payment_status === "successful")
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const successfulCount = payments.filter((p) => p.payment_status === "successful").length;
    const refundedCount = payments.filter((p) => p.payment_status === "refunded").length;
    const failedCount = payments.filter((p) => p.payment_status === "failed").length;

    return { totalRevenue, successfulCount, refundedCount, failedCount };
  }, [payments]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-clay-700">Financial Ledger</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-sand-900 sm:text-3xl">
            Payments & Transactions
          </h1>
          <p className="mt-2 text-sm text-sand-600">
            Audit payment receipts, simulated settlements, and refunds for {selectedHotel.name}.
          </p>
        </div>
      </header>

      {!reportsAllowed ? (
        <p className="rounded-lg border border-sand-200 bg-white px-4 py-3 text-sm text-sand-600">
          Payments are visible to hotel owners and managers.
        </p>
      ) : null}
      {request.error ? (
        <ErrorNotice
          message={describeApiError(request.error)}
          onRetry={request.reload}
        />
      ) : null}

      {/* KPI Stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Settled Revenue"
          value={currencyFormat.format(metrics.totalRevenue)}
          hint="From successful payments"
        />
        <StatCard
          label="Successful Charges"
          value={String(metrics.successfulCount)}
          hint="Confirmed transactions"
        />
        <StatCard
          label="Refunded"
          value={String(metrics.refundedCount)}
          hint="Cancelled bookings"
        />
        <StatCard
          label="Failed Charges"
          value={String(metrics.failedCount)}
          hint="Declined attempts"
        />
      </section>

      {/* Filter and Table Card */}
      <section className="overflow-hidden rounded-xl border border-sand-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-sand-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {["all", "successful", "refunded", "failed"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                  statusFilter === status
                    ? "bg-clay-600 text-white shadow-sm"
                    : "bg-sand-100 text-sand-600 hover:bg-sand-200"
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="w-full sm:w-64">
            <input
              type="text"
              placeholder="Search guest or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-sand-300 px-3 py-1.5 text-xs text-sand-900 outline-none focus:border-clay-500 focus:ring-1 focus:ring-clay-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-sand-500 animate-pulse">
            Loading payments ledger...
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-10 text-center text-sm text-sand-500">
            No payments found matching the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-sand-50 text-xs uppercase tracking-wide text-sand-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Payment ID</th>
                  <th className="px-5 py-3 font-medium">Booking</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Gateway Provider</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {filteredPayments.map((payment) => (
                  <tr key={payment.payment_id} className="hover:bg-sand-50/50">
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-sand-900">
                      PAY-{payment.payment_id}
                    </td>
                    <td className="px-5 py-3 text-sand-700">
                      #{payment.booking_id}
                    </td>
                    <td className="px-5 py-3 font-medium text-sand-900">
                      {payment.customer_name}
                    </td>
                    <td className="px-5 py-3 text-xs text-sand-500 capitalize">
                      {payment.provider}
                    </td>
                    <td className="px-5 py-3 text-xs text-sand-600 whitespace-nowrap">
                      {formatDateTime(payment.paid_at || payment.created_at)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${
                          statusStyles[payment.payment_status] || "bg-sand-100 text-sand-700"
                        }`}
                      >
                        {payment.payment_status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-sand-900">
                      {currencyFormat.format(Number(payment.amount))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
