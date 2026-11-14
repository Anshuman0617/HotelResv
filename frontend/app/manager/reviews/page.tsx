"use client";

import { useMemo, useState } from "react";
import ManagerModal from "@/components/manager/ManagerModal";
import { useManagerHotel } from "@/components/manager/ManagerHotelContext";
import { managerReviews, type ManagerReview } from "@/lib/manager/mock";

const pageSize = 6;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export default function ManagerReviewsPage() {
  const { hotels, selectedHotel, setSelectedHotelId } = useManagerHotel();
  const [query, setQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedReview, setSelectedReview] = useState<ManagerReview | null>(
    null,
  );

  const hotelReviews = useMemo(
    () =>
      managerReviews
        .filter((review) => review.hotel_id === selectedHotel.id)
        .sort((left, right) =>
          right.review_date.localeCompare(left.review_date),
        ),
    [selectedHotel.id],
  );
  const filteredReviews = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return hotelReviews.filter((review) => {
      const matchesQuery =
        !normalizedQuery ||
        review.guest_name.toLocaleLowerCase().includes(normalizedQuery) ||
        review.comment.toLocaleLowerCase().includes(normalizedQuery);
      const matchesRating =
        ratingFilter === "all" || review.rating === Number(ratingFilter);
      return matchesQuery && matchesRating;
    });
  }, [hotelReviews, query, ratingFilter]);

  const averageRating = hotelReviews.length
    ? hotelReviews.reduce((total, review) => total + review.rating, 0) /
      hotelReviews.length
    : null;
  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageReviews = filteredReviews.slice(
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
            Reviews
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Browse guest feedback and rating previews for this hotel.
          </p>
        </div>
        <span className="w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
          Mock preview · Not retrieved from database
        </span>
      </header>

      <section
        aria-label="Review summary"
        className="grid gap-4 sm:grid-cols-2"
      >
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-600">Average rating</p>
          {averageRating === null ? (
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-400">
              No reviews
            </p>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-3xl font-semibold tracking-tight text-slate-900">
                {averageRating.toFixed(2)}
                <span className="ml-1 text-base font-medium text-slate-500">
                  / 5
                </span>
              </p>
              <span
                className="text-lg tracking-wide text-amber-500"
                aria-label={`${averageRating.toFixed(2)} out of 5 stars`}
              >
                {"★".repeat(Math.round(averageRating))}
              </span>
            </div>
          )}
          <p className="mt-1 text-xs text-slate-500">{selectedHotel.name}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-600">Total reviews</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {hotelReviews.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {hotelReviews.length === 0
              ? "No review previews are available for this hotel."
              : `Sampled review fixtures for ${selectedHotel.name}.`}
          </p>
        </article>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 sm:col-span-1">
            Search guest or review
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Guest name or review content"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-normal normal-case text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Hotel
            <select
              value={selectedHotel.id}
              onChange={(event) => {
                setSelectedHotelId(Number(event.target.value));
                setPage(1);
              }}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal normal-case text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              {hotels.map((hotel) => {
                const hasReviews = managerReviews.some(
                  (review) => review.hotel_id === hotel.id,
                );
                return (
                  <option key={hotel.id} value={hotel.id}>
                    {hotel.name} · {hotel.city}
                    {hasReviews ? "" : " · No reviews"}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Rating
            <select
              value={ratingFilter}
              onChange={(event) => {
                setRatingFilter(event.target.value);
                setPage(1);
              }}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal normal-case text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="all">All ratings</option>
              <option value="5">5 stars</option>
              <option value="4">4 stars</option>
              <option value="3">3 stars</option>
              <option value="2">2 stars</option>
              <option value="1">1 star</option>
            </select>
          </label>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-1 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Guest reviews</h2>
            <p className="mt-1 text-sm text-slate-500">
              {filteredReviews.length} matching review
              {filteredReviews.length === 1 ? "" : "s"} for {selectedHotel.name}
            </p>
          </div>
          <span className="text-xs text-slate-500">
            Select a row to view the full review
          </span>
        </div>

        {pageReviews.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Guest</th>
                    <th className="px-4 py-3 font-medium">Hotel</th>
                    <th className="px-4 py-3 font-medium">Rating</th>
                    <th className="px-4 py-3 font-medium">Review</th>
                    <th className="px-4 py-3 font-medium">Review date</th>
                    <th className="px-4 py-3 font-medium">Booking ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageReviews.map((review) => (
                    <tr
                      key={review.id}
                      tabIndex={0}
                      onClick={() => setSelectedReview(review)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedReview(review);
                        }
                      }}
                      className="cursor-pointer hover:bg-slate-50/70 focus:bg-slate-50 focus:outline-none"
                      aria-label={`View review by ${review.guest_name}`}
                    >
                      <td className="whitespace-nowrap px-4 py-4 font-medium text-slate-900">
                        {review.guest_name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">
                        {selectedHotel.name}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <RatingStars rating={review.rating} />
                      </td>
                      <td className="max-w-sm px-4 py-4 text-slate-700">
                        <p className="line-clamp-2">{review.comment}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                        {formatDate(review.review_date)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-700">
                        #{review.reservation_id}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Showing {(currentPage - 1) * pageSize + 1}–
                {Math.min(currentPage * pageSize, filteredReviews.length)} of{" "}
                {filteredReviews.length}
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
              {hotelReviews.length === 0
                ? "No reviews for this hotel"
                : "No matching reviews"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {hotelReviews.length === 0
                ? "This hotel has no review preview data. No rating is shown."
                : "Change the search or filters to see matching reviews."}
            </p>
          </div>
        )}
      </section>

      <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        These illustrative review records are mock fixtures only and have not
        been retrieved from the database. Hotels without review fixtures have
        no displayed average rating.
      </p>

      {selectedReview ? (
        <ManagerModal
          title={`Review for booking #${selectedReview.reservation_id}`}
          onClose={() => setSelectedReview(null)}
        >
          <div className="grid gap-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold text-slate-900">
                  {selectedReview.guest_name}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedHotel.name}
                </p>
              </div>
              <RatingStars rating={selectedReview.rating} />
            </div>
            <blockquote className="rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              {selectedReview.comment}
            </blockquote>
            <dl className="grid gap-x-6 gap-y-4 rounded-lg border border-slate-200 p-4 sm:grid-cols-2">
              <Detail
                label="Booking ID"
                value={`#${selectedReview.reservation_id}`}
              />
              <Detail
                label="Review date"
                value={formatDate(selectedReview.review_date)}
              />
              <Detail label="Hotel" value={selectedHotel.name} />
              <Detail
                label="Rating"
                value={`${selectedReview.rating} out of 5`}
              />
            </dl>
            <p className="text-xs leading-5 text-slate-500">
              Preview fixture only; this review has not been retrieved from a
              database.
            </p>
          </div>
        </ManagerModal>
      ) : null}
    </div>
  );
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <span
      className="whitespace-nowrap tracking-wide text-amber-500"
      aria-label={`${rating} out of 5 stars`}
    >
      {"★".repeat(rating)}
      <span className="text-slate-300">{"☆".repeat(5 - rating)}</span>
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
