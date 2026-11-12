"use client";

import { useMemo } from "react";
import { useManagerHotel } from "@/components/manager/ManagerHotelContext";
import {
  query3MockPreview,
  query4MockPreview,
} from "@/lib/manager/mock";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default function ManagerQueryPreview() {
  const { selectedHotel } = useManagerHotel();
  const revenueRows = useMemo(
    () =>
      query3MockPreview.rows.filter(
        (row) => row.hotel_id === selectedHotel.id,
      ),
    [selectedHotel.id],
  );
  const popularRoomRows = useMemo(
    () =>
      query4MockPreview.rows
        .filter((row) => row.hotel_id === selectedHotel.id)
        .sort((left, right) => right.times_booked - left.times_booked),
    [selectedHotel.id],
  );

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Reporting query previews
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Query 3 monthly revenue and Query 4 popular room types, scoped to{" "}
            {selectedHotel.name}.
          </p>
        </div>
        <span className="w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
          Mock preview · SQL not executed
        </span>
      </header>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="font-semibold text-slate-900">
              Query 3 · Monthly revenue
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Successful payments aggregated by month.
            </p>
          </div>
          {revenueRows.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Month</th>
                    <th className="px-5 py-3 text-right font-medium">Paid bookings</th>
                    <th className="px-5 py-3 text-right font-medium">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {revenueRows.map((row) => (
                    <tr key={`${row.hotel_id}-${row.revenue_month}`}>
                      <td className="px-5 py-3 text-slate-700">
                        {formatMonth(row.revenue_month)}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-700">
                        {row.paid_bookings_count}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-slate-900">
                        {currency.format(row.monthly_revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPreview />
          )}
        </article>

        <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="font-semibold text-slate-900">
              Query 4 · Popular room types
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Confirmed and completed booking-room counts.
            </p>
          </div>
          {popularRoomRows.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Room type</th>
                    <th className="px-5 py-3 text-right font-medium">Times booked</th>
                    <th className="px-5 py-3 text-right font-medium">Avg. rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {popularRoomRows.map((row) => (
                    <tr key={row.room_type_id}>
                      <td className="px-5 py-3 font-medium text-slate-900">
                        {row.room_type_name}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-700">
                        {row.times_booked}
                      </td>
                      <td className="px-5 py-3 text-right text-slate-700">
                        {currency.format(row.avg_booked_nightly_rate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPreview />
          )}
        </article>
      </div>
      <p className="text-xs leading-5 text-slate-500">
        These illustrative rows are fixtures for the future API/query result
        adapter; they are not database output. Run the SQL in{" "}
        <code>database/queries.sql</code> against PostgreSQL for real figures.
      </p>
    </section>
  );
}

function formatMonth(value: string) {
  const [year, month] = value.split("-");
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(Number(year), Number(month) - 1, 1)));
}

function EmptyPreview() {
  return (
    <p className="px-5 py-8 text-sm text-slate-500">
      No preview rows are available for this hotel.
    </p>
  );
}
