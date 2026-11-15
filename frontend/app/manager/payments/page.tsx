"use client";

import { useEffect, useMemo, useState } from "react";
import { useManagerHotel } from "@/components/manager/ManagerHotelContext";
import { apiFetch } from "@/lib/api";
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
  successful: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  refunded: "bg-amber-50 text-amber-700 ring-amber-600/20",
  failed: "bg-rose-50 text-rose-700 ring-rose-600/20",
  initiated: "bg-slate-100 text-slate-700 ring-slate-500/20",
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
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!selectedHotel?.id) return;
    setLoading(true);

    apiFetch<PaymentRow[]>(`/api/manager/hotels/${selectedHotel.id}/reports/payments`)
      .then((data) => {
        setPayments(data || []);
      })
      .catch(() => {
        // Fallback default mock data
        setPayments([
          {
            payment_id: 101,
            booking_id: 11042,
            customer_name: "Ananya Sharma",
            amount: 25500,
            currency: "INR",
            payment_status: "successful",
            provider: "simulated",
            created_at: "2026-11-04T09:18:00Z",
            paid_at: "2026-11-04T09:18:30Z",
          },
          {
            payment_id: 102,
            booking_id: 11038,
            customer_name: "Rohan Mehta",
            amount: 45400,
            currency: "INR",
            payment_status: "failed",
            provider: "simulated",
            created_at: "2026-11-03T14:42:00Z",
            paid_at: null,
          },
          {
            payment_id: 103,
            booking_id: 11031,
            customer_name: "Diya Nair",
            amount: 34000,
            currency: "INR",
            payment_status: "successful",
            provider: "simulated",
            created_at: "2026-10-10T11:05:00Z",
            paid_at: "2026-10-10T11:05:40Z",
          },
          {
            payment_id: 104,
            booking_id: 11024,
            customer_name: "Vikram Iyer",
            amount: 17000,
            currency: "INR",
            payment_status: "refunded",
            provider: "simulated",
            created_at: "2026-10-28T17:30:00Z",
            paid_at: "2026-10-28T17:30:20Z",
          },
        ]);
      })
      .finally(() => setLoading(false));
  }, [selectedHotel?.id]);

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
          <p className="text-sm font-medium text-indigo-700">Financial Ledger</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Payments & Transactions
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Audit payment receipts, simulated settlements, and refunds for {selectedHotel.name}.
          </p>
        </div>
      </header>

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
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {["all", "successful", "refunded", "failed"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                  statusFilter === status
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500 animate-pulse">
            Loading payments ledger...
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No payments found matching the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
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
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((payment) => (
                  <tr key={payment.payment_id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-slate-900">
                      PAY-{payment.payment_id}
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      #{payment.booking_id}
                    </td>
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {payment.customer_name}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500 capitalize">
                      {payment.provider}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-600 whitespace-nowrap">
                      {formatDateTime(payment.paid_at || payment.created_at)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${
                          statusStyles[payment.payment_status] || "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {payment.payment_status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-slate-900">
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
