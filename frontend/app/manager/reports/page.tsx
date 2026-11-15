"use client";

import { useMemo, useState } from "react";
import { useManagerHotel } from "@/components/manager/ManagerHotelContext";
import { ErrorNotice } from "@/components/manager/LoadState";
import { describeApiError, useApiData } from "@/lib/manager/useApiData";
import type {
  HotelRatingResult,
  MonthlyRevenueResult,
  PopularRoomTypeResult,
} from "@/lib/manager/types";

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
  const { selectedHotel } = useManagerHotel();
  const reportsAllowed = selectedHotel.role !== "staff";
  const base = `/api/manager/hotels/${selectedHotel.id}/reports`;
  const revenue = useApiData<MonthlyRevenueResult[]>(
    reportsAllowed ? `${base}/revenue` : null,
  );
  const popular = useApiData<PopularRoomTypeResult[]>(
    reportsAllowed ? `${base}/popular-room-types` : null,
  );
  const ratings = useApiData<HotelRatingResult[]>(
    "/api/manager/reports/top-rated-hotels",
  );
  const [monthChoice, setSelectedMonth] = useState<{
    hotelId: number;
    month: string;
  } | null>(null);
  // A month picked for one hotel does not carry over to another.
  const selectedMonth =
    monthChoice?.hotelId === selectedHotel.id ? monthChoice.month : allMonths;

  // Query 3 already returns newest month first.
  const hotelRevenueRows = useMemo(() => revenue.data ?? [], [revenue.data]);
  const months = useMemo(
    () => [...new Set(hotelRevenueRows.map((row) => row.revenue_month))],
    [hotelRevenueRows],
  );
  const revenueRows =
    selectedMonth === allMonths
      ? hotelRevenueRows
      : hotelRevenueRows.filter((row) => row.revenue_month === selectedMonth);
  const reportingPeriodRevenue = revenueRows.reduce(
    (total, row) => total + Number(row.monthly_revenue),
    0,
  );
  const maxMonthlyRevenue = Math.max(
    ...hotelRevenueRows.map((row) => Number(row.monthly_revenue)),
    0,
  );

  // Query 4 is ordered by times booked, then revenue.
  const popularRoomRows = popular.data ?? [];

  // Query 5 is ordered by average rating, then review count.
  const rankedHotels = ratings.data ?? [];
  const selectedIsRanked = rankedHotels.some(
    (row) => row.hotel_id === selectedHotel.id,
  );
  const loadError = revenue.error ?? popular.error ?? ratings.error;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-clay-700">
            Manager workspace
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-sand-900 sm:text-3xl">
            Reports
          </h1>
          <p className="mt-2 text-sm text-sand-600">
            Live results of the reporting SQL queries for{" "}
            {selectedHotel.name}.
          </p>
        </div>
      </header>

      {!reportsAllowed ? (
        <p className="rounded-lg border border-sand-200 bg-white px-4 py-3 text-sm text-sand-600">
          Revenue and room-type reports are visible to owners and managers.
        </p>
      ) : null}
      {loadError ? (
        <ErrorNotice
          message={describeApiError(loadError)}
          onRetry={() => {
            revenue.reload();
            popular.reload();
            ratings.reload();
          }}
        />
      ) : null}

      <section
        aria-labelledby="revenue-title"
        className="overflow-hidden rounded-xl border border-sand-200 bg-white shadow-sm"
      >
        <div className="flex flex-col gap-3 border-b border-sand-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-clay-700">
              Query 3
            </p>
            <h2
              id="revenue-title"
              className="mt-1 text-lg font-semibold text-sand-900"
            >
              Monthly revenue
            </h2>
            <p className="mt-1 text-sm text-sand-500">
              Successful payments grouped by month for {selectedHotel.name}.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-sand-600">
            Reporting period
            <select
              value={selectedMonth}
              onChange={(event) =>
                setSelectedMonth({
                  hotelId: selectedHotel.id,
                  month: event.target.value,
                })
              }
              className="rounded-md border border-sand-300 bg-white px-3 py-2 text-sm text-sand-900"
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
            <h3 className="text-sm font-semibold text-sand-700">
              Revenue by month
            </h3>
            {revenueRows.length ? (
              <div className="mt-4 flex flex-col gap-4">
                {revenueRows.map((row) => (
                  <div
                    key={`${row.hotel_id}-${row.revenue_month}`}
                    className="grid grid-cols-[5.5rem_minmax(0,1fr)_auto] items-center gap-3 text-sm"
                  >
                    <span className="text-sand-600">
                      {formatMonth(row.revenue_month)}
                    </span>
                    <div
                      className="h-3 overflow-hidden rounded-full bg-sand-100"
                      role="img"
                      aria-label={`${currency.format(Number(row.monthly_revenue))} revenue`}
                    >
                      <div
                        className="h-full rounded-full bg-clay-600"
                        style={{
                          width: `${(Number(row.monthly_revenue) / maxMonthlyRevenue) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-right font-medium text-sand-900">
                      {currency.format(Number(row.monthly_revenue))}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                message={
                  revenue.loading && !revenue.data
                    ? "Loading revenue…"
                    : "No successful payments for this hotel and period."
                }
              />
            )}
          </div>

          <div className="flex flex-col justify-center rounded-lg bg-clay-50 p-5">
            <p className="text-sm font-medium text-clay-800">
              Total revenue for selected period
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-clay-950">
              {currency.format(reportingPeriodRevenue)}
            </p>
            <p className="mt-2 text-xs text-clay-800">
              {selectedMonth === allMonths
                ? `${revenueRows.length} available months`
                : formatMonth(selectedMonth)}{" "}
              · {selectedHotel.name}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto border-t border-sand-100">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-sand-50 text-xs uppercase tracking-wide text-sand-500">
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
            <tbody className="divide-y divide-sand-100">
              {revenueRows.map((row) => (
                <tr key={`${row.hotel_id}-${row.revenue_month}`}>
                  <td className="px-5 py-3 text-sand-700">
                    {formatMonth(row.revenue_month)}
                  </td>
                  <td className="px-5 py-3 text-sand-700">
                    {row.hotel_name}
                  </td>
                  <td className="px-5 py-3 text-right text-sand-700">
                    {row.paid_bookings_count}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-sand-900">
                    {currency.format(Number(row.monthly_revenue))}
                  </td>
                </tr>
              ))}
              {!revenueRows.length ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-6 text-center text-sand-500"
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
        className="overflow-hidden rounded-xl border border-sand-200 bg-white shadow-sm"
      >
        <div className="border-b border-sand-200 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-clay-700">
            Query 4
          </p>
          <h2
            id="room-types-title"
            className="mt-1 text-lg font-semibold text-sand-900"
          >
            Popular room types
          </h2>
          <p className="mt-1 text-sm text-sand-500">
            Ranked by confirmed and completed bookings at {selectedHotel.name}.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-sand-50 text-xs uppercase tracking-wide text-sand-500">
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
            <tbody className="divide-y divide-sand-100">
              {popularRoomRows.map((row, index) => (
                <tr key={row.room_type_id}>
                  <td className="px-5 py-3 font-medium text-sand-500">
                    {index + 1}
                  </td>
                  <td className="px-5 py-3 font-medium text-sand-900">
                    {row.room_type_name}
                  </td>
                  <td className="px-5 py-3 text-right text-sand-700">
                    {row.times_booked}
                  </td>
                  <td className="px-5 py-3 text-right text-sand-700">
                    {currency.format(Number(row.avg_booked_nightly_rate))}
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-sand-900">
                    {currency.format(Number(row.total_room_revenue))}
                  </td>
                </tr>
              ))}
              {!popularRoomRows.length ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-6 text-center text-sand-500"
                  >
                    {popular.loading && !popular.data
                      ? "Loading room types…"
                      : "No confirmed or completed bookings for this hotel yet."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section
        aria-labelledby="ratings-title"
        className="overflow-hidden rounded-xl border border-sand-200 bg-white shadow-sm"
      >
        <div className="border-b border-sand-200 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-clay-700">
            Query 5
          </p>
          <h2
            id="ratings-title"
            className="mt-1 text-lg font-semibold text-sand-900"
          >
            Hotel ratings
          </h2>
          <p className="mt-1 text-sm text-sand-500">
            Every hotel that meets the threshold, ranked by average rating;{" "}
            {selectedHotel.name} is highlighted.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-sand-50 text-xs uppercase tracking-wide text-sand-500">
              <tr>
                <th className="px-5 py-3 font-medium">Rank</th>
                <th className="px-5 py-3 font-medium">Hotel</th>
                <th className="px-5 py-3 text-right font-medium">
                  Average rating
                </th>
                <th className="px-5 py-3 text-right font-medium">Reviews</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-100">
              {rankedHotels.map((row, index) => {
                const isSelected = row.hotel_id === selectedHotel.id;
                return (
                  <tr
                    key={row.hotel_id}
                    className={isSelected ? "bg-clay-50/70" : undefined}
                  >
                    <td className="px-5 py-3 text-sand-500">{index + 1}</td>
                    <td className="px-5 py-3">
                      <span className="font-medium text-sand-900">
                        {row.hotel_name}
                      </span>
                      <span className="ml-2 text-sand-500">{row.city}</span>
                      {isSelected ? (
                        <span className="ml-2 rounded-full bg-clay-100 px-2 py-0.5 text-xs font-medium text-clay-800">
                          Selected
                        </span>
                      ) : null}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-sand-900">
                      {ratingFormat.format(Number(row.average_rating))} / 5
                    </td>
                    <td className="px-5 py-3 text-right text-sand-700">
                      {row.total_reviews}
                    </td>
                  </tr>
                );
              })}
              {ratings.data && !selectedIsRanked ? (
                <tr className="bg-clay-50/70">
                  <td className="px-5 py-3 text-sand-500">—</td>
                  <td className="px-5 py-3">
                    <span className="font-medium text-sand-900">
                      {selectedHotel.name}
                    </span>
                    <span className="ml-2 text-sand-500">{selectedHotel.city}</span>
                  </td>
                  <td colSpan={2} className="px-5 py-3 text-right text-sand-500">
                    Not ranked (needs at least 3 reviews averaging 3.5+)
                  </td>
                </tr>
              ) : null}
              {ratings.loading && !ratings.data ? (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-sand-500">
                    Loading ratings…
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <p className="border-t border-sand-100 px-5 py-3 text-xs leading-5 text-sand-500">
          Query 5 requires at least 3 reviews and a 3.5 average rating
          (HAVING clause), so hotels below the threshold are not ranked.
        </p>
      </section>

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
  return <p className="mt-4 text-sm text-sand-500">{message}</p>;
}
