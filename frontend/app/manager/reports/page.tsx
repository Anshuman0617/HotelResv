"use client";

import { useMemo, useState } from "react";
import { useManagerHotel } from "@/components/manager/ManagerHotelContext";
import {
  query3MockPreview,
  query4MockPreview,
  query5MockPreview,
} from "@/lib/manager/mock";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const ratingFormat = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const allMonths = "all";

export default function ManagerReportsPage() {
  const { hotels, selectedHotel } = useManagerHotel();
  const [selectedMonth, setSelectedMonth] = useState(allMonths);

  const hotelRevenueRows = useMemo(
    () =>
      query3MockPreview.rows
        .filter((row) => row.hotel_id === selectedHotel.id)
        .sort((left, right) =>
          right.revenue_month.localeCompare(left.revenue_month),
        ),
    [selectedHotel.id],
  );
  const months = useMemo(
    () => [...new Set(hotelRevenueRows.map((row) => row.revenue_month))],
    [hotelRevenueRows],
  );
  const revenueRows =
    selectedMonth === allMonths
      ? hotelRevenueRows
      : hotelRevenueRows.filter((row) => row.revenue_month === selectedMonth);
  const reportingPeriodRevenue = revenueRows.reduce(
    (total, row) => total + row.monthly_revenue,
    0,
  );
  const maxMonthlyRevenue = Math.max(
    ...hotelRevenueRows.map((row) => row.monthly_revenue),
    0,
  );

  const popularRoomRows = query4MockPreview.rows
    .filter((row) => row.hotel_id === selectedHotel.id)
    .sort(
      (left, right) =>
        right.times_booked - left.times_booked ||
        right.total_room_revenue - left.total_room_revenue,
    );

  const ratingByHotelId = new Map(
    query5MockPreview.rows.map((row) => [row.hotel_id, row]),
  );
  const rankedHotels = [
    ...query5MockPreview.rows.map((row) => ({
      hotel: hotels.find((hotel) => hotel.id === row.hotel_id),
      rating: row,
      withoutReviews: false,
    })),
    ...query5MockPreview.hotelsWithoutReviews
      .map((hotelId) => ({
        hotel: hotels.find((item) => item.id === hotelId),
        rating: undefined,
        withoutReviews: true,
      }))
      .filter((item) => item.hotel),
  ]
    .filter((item) => item.hotel)
    .sort((left, right) => {
      if (!left.rating) return 1;
      if (!right.rating) return -1;
      return (
        right.rating.average_rating - left.rating.average_rating ||
        right.rating.total_reviews - left.rating.total_reviews
      );
    });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-indigo-700">
            Manager workspace
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Reports
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Performance previews for {selectedHotel.name} and your hotel
            portfolio.
          </p>
        </div>
        <span className="w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
          Mock preview · Database not connected
        </span>
      </header>

      <section
        aria-labelledby="revenue-title"
        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
              Query 3
            </p>
            <h2
              id="revenue-title"
              className="mt-1 text-lg font-semibold text-slate-900"
            >
              Monthly revenue
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Successful payments grouped by month for {selectedHotel.name}.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
            Reporting period
            <select
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value={allMonths}>All available months</option>
              {months.map((month) => (
                <option key={month} value={month}>
                  {formatMonth(month)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(16rem,0.7fr)]">
          <div>
            <h3 className="text-sm font-semibold text-slate-700">
              Revenue by month
            </h3>
            {revenueRows.length ? (
              <div className="mt-4 flex flex-col gap-4">
                {revenueRows.map((row) => (
                  <div
                    key={`${row.hotel_id}-${row.revenue_month}`}
                    className="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-3 text-sm"
                  >
                    <span className="text-slate-600">
                      {formatMonth(row.revenue_month)}
                    </span>
                    <div
                      className="h-3 overflow-hidden rounded-full bg-slate-100"
                      role="img"
                      aria-label={`${currency.format(row.monthly_revenue)} revenue`}
                    >
                      <div
                        className="h-full rounded-full bg-indigo-600"
                        style={{
                          width: `${(row.monthly_revenue / maxMonthlyRevenue) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-right font-medium text-slate-900">
                      {currency.format(row.monthly_revenue)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState message="No revenue preview is available for this hotel and period." />
            )}
          </div>

          <div className="flex flex-col justify-center rounded-lg bg-indigo-50 p-5">
            <p className="text-sm font-medium text-indigo-800">
              Total revenue for selected period
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-indigo-950">
              {currency.format(reportingPeriodRevenue)}
            </p>
            <p className="mt-2 text-xs text-indigo-800">
              {selectedMonth === allMonths
                ? `${revenueRows.length} available months`
                : formatMonth(selectedMonth)}{" "}
              · {selectedHotel.name}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto border-t border-slate-100">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Month</th>
                <th className="px-5 py-3 font-medium">Hotel</th>
                <th className="px-5 py-3 text-right font-medium">
                  Paid bookings
                </th>
                <th className="px-5 py-3 text-right font-medium">
                  Total revenue
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {revenueRows.map((row) => (
                <tr key={`${row.hotel_id}-${row.revenue_month}`}>
                  <td className="px-5 py-3 text-slate-700">
                    {formatMonth(row.revenue_month)}
                  </td>
                  <td className="px-5 py-3 text-slate-700">
                    {row.hotel_name}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-700">
                    {row.paid_bookings_count}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-slate-900">
                    {currency.format(row.monthly_revenue)}
                  </td>
                </tr>
              ))}
              {!revenueRows.length ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-6 text-center text-slate-500"
                  >
                    No revenue rows for this period.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section
        aria-labelledby="room-types-title"
        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
            Query 4
          </p>
          <h2
            id="room-types-title"
            className="mt-1 text-lg font-semibold text-slate-900"
          >
            Popular room types
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Ranked by confirmed and completed bookings at {selectedHotel.name}.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Rank</th>
                <th className="px-5 py-3 font-medium">Room type</th>
                <th className="px-5 py-3 text-right font-medium">Bookings</th>
                <th className="px-5 py-3 text-right font-medium">
                  Avg. nightly rate
                </th>
                <th className="px-5 py-3 text-right font-medium">
                  Room revenue
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {popularRoomRows.map((row, index) => (
                <tr key={row.room_type_id}>
                  <td className="px-5 py-3 font-medium text-slate-500">
                    {index + 1}
                  </td>
                  <td className="px-5 py-3 font-medium text-slate-900">
                    {row.room_type_name}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-700">
                    {row.times_booked}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-700">
                    {currency.format(row.avg_booked_nightly_rate)}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-slate-900">
                    {currency.format(row.total_room_revenue)}
                  </td>
                </tr>
              ))}
              {!popularRoomRows.length ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-6 text-center text-slate-500"
                  >
                    No room-type booking preview is available for this hotel.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section
        aria-labelledby="ratings-title"
        className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      >
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
            Query 5
          </p>
          <h2
            id="ratings-title"
            className="mt-1 text-lg font-semibold text-slate-900"
          >
            Hotel ratings
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Portfolio-wide ranking by average rating; {selectedHotel.name} is
            highlighted.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Rank</th>
                <th className="px-5 py-3 font-medium">Hotel</th>
                <th className="px-5 py-3 text-right font-medium">
                  Average rating
                </th>
                <th className="px-5 py-3 text-right font-medium">Reviews</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rankedHotels.map((item, index) => {
                if (!item.hotel) return null;
                const rating = ratingByHotelId.get(item.hotel.id);
                const isSelected = item.hotel.id === selectedHotel.id;

                return (
                  <tr
                    key={item.hotel.id}
                    className={isSelected ? "bg-indigo-50/70" : undefined}
                  >
                    <td className="px-5 py-3 text-slate-500">
                      {rating ? index + 1 : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-medium text-slate-900">
                        {item.hotel.name}
                      </span>
                      <span className="ml-2 text-slate-500">
                        {item.hotel.city}
                      </span>
                      {isSelected ? (
                        <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
                          Selected
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-slate-900">
                      {rating
                        ? `${ratingFormat.format(rating.average_rating)} / 5`
                        : item.withoutReviews
                          ? "No reviews"
                          : "Not ranked"}
                    </td>
                    <td className="px-5 py-3 text-right text-slate-700">
                      {rating
                        ? rating.total_reviews
                        : item.withoutReviews
                          ? 0
                          : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t border-slate-100 px-5 py-3 text-xs leading-5 text-slate-500">
          Query 5 requires at least 3 reviews and a 3.5 average rating. Hotels
          without reviews are shown as unranked, not as zero-star ratings, and
          are excluded from the SQL ranking.
        </p>
      </section>

      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        All figures on this page are mock previews based on the manager sample
        fixtures. No database queries have been executed; live figures require
        PostgreSQL query and backend/API integration.
      </p>
    </div>
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

function EmptyState({ message }: { message: string }) {
  return <p className="mt-4 text-sm text-slate-500">{message}</p>;
}
