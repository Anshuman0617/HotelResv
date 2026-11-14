"use client";

import { useEffect, useMemo, useState } from "react";
import { useManagerHotel } from "@/components/manager/ManagerHotelContext";
import { apiFetch } from "@/lib/api";
import StatCard from "@/components/manager/StatCard";

interface ReviewItem {
  id: number;
  rating: number;
  comment: string | null;
  created_at: string | null;
  user_name: string;
}

interface HotelReviewsData {
  hotel_id: number;
  total_reviews: number;
  average_rating: number;
  reviews: ReviewItem[];
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "Recent";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export default function ManagerReviewsPage() {
  const { selectedHotel } = useManagerHotel();
  const [reviewsData, setReviewsData] = useState<HotelReviewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);

  useEffect(() => {
    if (!selectedHotel?.id) return;
    setLoading(true);

    apiFetch<HotelReviewsData>(`/api/hotels/${selectedHotel.id}/reviews`)
      .then((data) => {
        setReviewsData(data);
      })
      .catch(() => {
        // Fallback mock reviews if API offline
        setReviewsData({
          hotel_id: selectedHotel.id,
          total_reviews: 4,
          average_rating: 4.75,
          reviews: [
            {
              id: 1,
              rating: 5,
              comment: "Exceptional hospitality! The staff went above and beyond to make our family stay memorable.",
              created_at: "2026-11-01T10:15:00Z",
              user_name: "Rahul Verma",
            },
            {
              id: 2,
              rating: 5,
              comment: "Clean rooms, great breakfast spread, and seamless check-in experience. Highly recommended.",
              created_at: "2026-10-25T14:30:00Z",
              user_name: "Pooja Desai",
            },
            {
              id: 3,
              rating: 4,
              comment: "Very comfortable beds and great ocean view. Room service was slightly delayed during peak dinner hour.",
              created_at: "2026-10-18T18:00:00Z",
              user_name: "Amitabh Sen",
            },
            {
              id: 4,
              rating: 5,
              comment: "Wonderful location close to the city center. Will definitely book again on my next business trip.",
              created_at: "2026-10-12T08:45:00Z",
              user_name: "Sneha Mukherjee",
            },
          ],
        });
      })
      .finally(() => setLoading(false));
  }, [selectedHotel?.id]);

  const allReviews = reviewsData?.reviews || [];

  const filteredReviews = useMemo(() => {
    if (ratingFilter === null) return allReviews;
    return allReviews.filter((r) => r.rating === ratingFilter);
  }, [allReviews, ratingFilter]);

  const ratingCounts = useMemo(() => {
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    allReviews.forEach((r) => {
      counts[r.rating] = (counts[r.rating] || 0) + 1;
    });
    return counts;
  }, [allReviews]);

  const satisfactionRate = useMemo(() => {
    if (allReviews.length === 0) return 0;
    const highRatings = allReviews.filter((r) => r.rating >= 4).length;
    return Math.round((highRatings / allReviews.length) * 100);
  }, [allReviews]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-indigo-700">Reputation Management</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Guest Reviews & Feedback
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Monitor customer satisfaction, ratings breakdown, and feedback for {selectedHotel.name}.
          </p>
        </div>
      </header>

      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Average Rating"
          value={reviewsData?.average_rating ? `${reviewsData.average_rating} ★` : "—"}
          hint="Out of 5.0 maximum"
        />
        <StatCard
          label="Total Reviews"
          value={String(reviewsData?.total_reviews ?? 0)}
          hint="From verified stays"
        />
        <StatCard
          label="5-Star Ratings"
          value={String(ratingCounts[5] ?? 0)}
          hint="Top satisfaction ratings"
        />
        <StatCard
          label="Satisfaction Rate"
          value={`${satisfactionRate}%`}
          hint="Rated 4 stars or above"
        />
      </section>

      {/* Rating Breakdown & Filter Section */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* Rating Breakdown card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
          <h3 className="font-semibold text-sm text-slate-900">Rating Distribution</h3>
          <div className="space-y-2 pt-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratingCounts[star] || 0;
              const percent = allReviews.length > 0 ? (count / allReviews.length) * 100 : 0;
              return (
                <button
                  key={star}
                  onClick={() => setRatingFilter(ratingFilter === star ? null : star)}
                  className={`w-full flex items-center gap-3 text-xs p-1.5 rounded-md transition-colors ${
                    ratingFilter === star ? "bg-amber-50 font-bold" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="w-12 text-slate-700 text-left">{star} stars</span>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-6 text-slate-400 text-right">{count}</span>
                </button>
              );
            })}
          </div>
          {ratingFilter !== null && (
            <button
              onClick={() => setRatingFilter(null)}
              className="text-xs text-indigo-600 hover:underline pt-2 inline-block"
            >
              Show all reviews
            </button>
          )}
        </div>

        {/* Reviews Feed */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="font-semibold text-slate-900">
              Customer Comments {ratingFilter !== null ? `(${ratingFilter} Stars)` : `(${filteredReviews.length})`}
            </h3>
            <span className="text-xs text-slate-400">Verified Stays</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500 animate-pulse">
              Loading reviews...
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">
              No reviews found matching the selected filter.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredReviews.map((rev) => (
                <div key={rev.id} className="py-4 first:pt-4 last:pb-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-900">{rev.user_name}</span>
                    <span className="text-xs text-slate-400">{formatDate(rev.created_at)}</span>
                  </div>
                  <div className="flex items-center text-amber-400 text-sm">
                    {"★".repeat(rev.rating)}
                    <span className="text-slate-200">{"★".repeat(5 - rev.rating)}</span>
                  </div>
                  {rev.comment && (
                    <p className="text-sm text-slate-600 leading-relaxed bg-slate-50/50 p-3 rounded-lg border border-slate-100">
                      "{rev.comment}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
