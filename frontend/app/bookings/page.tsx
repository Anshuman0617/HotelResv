"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import type { BookingStatus } from "@/lib/types";

interface BookingDetail {
  id: number;
  check_in: string;
  check_out: string;
  guest_count: number;
  status: BookingStatus;
  created_at: string;
  hotel_id: number | null;
  total: number;
  rooms: Array<{
    room_type_id: number;
    room_type_name: string;
    room_id: number | null;
    room_number: string | null;
    guest_count: number;
    nightly_rate: number;
  }>;
  payments: Array<{
    id: number;
    amount: number;
    currency: string;
    status: string;
    created_at: string;
    paid_at: string | null;
  }>;
  review: {
    id: number;
    rating: number;
    comment: string | null;
  } | null;
}

const statusStyles: Record<BookingStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
  completed: "bg-slate-100 text-slate-700",
};

function formatPrice(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function BookingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<BookingDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // Review modal state
  const [reviewBookingId, setReviewBookingId] = useState<number | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  function fetchBookings() {
    setLoading(true);
    setError(null);
    apiFetch<BookingDetail[]>("/api/bookings")
      .then((data) => setBookings(data))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load bookings");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (user) {
      fetchBookings();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  async function handleCancel(bookingId: number) {
    if (!confirm("Are you sure you want to cancel this booking? Any successful payment will be refunded.")) {
      return;
    }

    setCancellingId(bookingId);
    try {
      await apiFetch(`/api/bookings/${bookingId}/cancel`, { method: "POST" });
      fetchBookings();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Cancellation failed");
    } finally {
      setCancellingId(null);
    }
  }

  async function handleCompleteStay(bookingId: number) {
    try {
      await apiFetch(`/api/bookings/${bookingId}/complete`, { method: "POST" });
      fetchBookings();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to mark stay completed");
    }
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!reviewBookingId) return;

    setReviewSubmitting(true);
    try {
      await apiFetch(`/api/bookings/${reviewBookingId}/reviews`, {
        method: "POST",
        body: JSON.stringify({ rating, comment: comment.trim() || null }),
      });
      setReviewBookingId(null);
      setComment("");
      fetchBookings();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setReviewSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-12">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
        <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center gap-6 px-4 py-16">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Sign in to view bookings</h1>
          <p className="mt-2 text-sm text-slate-600">
            Access your past and upcoming reservations.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <Link
              href="/login"
              className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-md border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Register
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          My bookings
        </h1>
        <p className="text-slate-600">
          Manage your room reservations, view transaction history, and post reviews.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-44 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
          <p>{error}</p>
          <button
            onClick={fetchBookings}
            className="mt-3 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      ) : bookings.length === 0 ? (
        <section className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
          <p className="text-lg font-medium text-slate-700">No bookings yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Browse our curated selection of hotels and reserve your next stay.
          </p>
          <Link
            href="/hotels"
            className="mt-4 inline-block rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            Explore hotels
          </Link>
        </section>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <article
              key={booking.id}
              className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Reservation
                  </span>
                  <h2 className="text-lg font-bold text-slate-900">
                    Booking #{booking.id}
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyles[booking.status]}`}
                  >
                    {booking.status}
                  </span>
                  {booking.status === "pending" || booking.status === "confirmed" ? (
                    <button
                      onClick={() => handleCancel(booking.id)}
                      disabled={cancellingId === booking.id}
                      className="rounded-md border border-rose-200 px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                    >
                      {cancellingId === booking.id ? "Cancelling..." : "Cancel"}
                    </button>
                  ) : null}
                  {booking.status === "confirmed" && (
                    <button
                      onClick={() => handleCompleteStay(booking.id)}
                      className="rounded-md bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                    >
                      Complete Stay
                    </button>
                  )}
                  {booking.status === "completed" && !booking.review && (
                    <button
                      onClick={() => setReviewBookingId(booking.id)}
                      className="rounded-md bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                    >
                      Write Review
                    </button>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                <div>
                  <span className="text-slate-500">Check-in</span>
                  <p className="font-medium text-slate-800">{booking.check_in}</p>
                </div>
                <div>
                  <span className="text-slate-500">Check-out</span>
                  <p className="font-medium text-slate-800">{booking.check_out}</p>
                </div>
                <div>
                  <span className="text-slate-500">Guests</span>
                  <p className="font-medium text-slate-800">{booking.guest_count} guest{booking.guest_count > 1 ? "s" : ""}</p>
                </div>
                <div>
                  <span className="text-slate-500">Total Price</span>
                  <p className="font-bold text-slate-900">{formatPrice(Number(booking.total))}</p>
                </div>
              </div>

              {/* Rooms reserved */}
              {booking.rooms && booking.rooms.length > 0 && (
                <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                  <span className="font-semibold text-slate-700">Rooms: </span>
                  {booking.rooms.map((r, i) => (
                    <span key={i} className="mr-3">
                      {r.room_type_name} (₹{r.nightly_rate}/night)
                      {r.room_number ? ` · Room ${r.room_number}` : ""}
                    </span>
                  ))}
                </div>
              )}

              {/* Payment status badge / history */}
              {booking.payments && booking.payments.length > 0 && (
                <div className="text-xs text-slate-500 flex items-center gap-2">
                  <span>Payments:</span>
                  {booking.payments.map((p) => (
                    <span
                      key={p.id}
                      className={`rounded px-2 py-0.5 font-medium capitalize ${
                        p.status === "successful"
                          ? "bg-emerald-50 text-emerald-700"
                          : p.status === "refunded"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {p.status} ({formatPrice(Number(p.amount))})
                    </span>
                  ))}
                </div>
              )}

              {/* Review display if exists */}
              {booking.review && (
                <div className="rounded-md border border-amber-200 bg-amber-50/50 p-3 text-xs text-slate-700">
                  <span className="font-semibold text-amber-700">Your Rating: {"★".repeat(booking.review.rating)}{"☆".repeat(5 - booking.review.rating)}</span>
                  {booking.review.comment && (
                    <p className="mt-1 text-slate-600 italic">"{booking.review.comment}"</p>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {reviewBookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Review Booking #{reviewBookingId}</h3>
            <form onSubmit={handleSubmitReview} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Rating (1 to 5 stars)
                </label>
                <div className="mt-1 flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setRating(star)}
                      className={`text-2xl ${rating >= star ? "text-amber-400" : "text-slate-300"}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Comment (optional)
                </label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your experience..."
                  className="mt-1 w-full rounded-md border border-slate-300 p-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewBookingId(null)}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {reviewSubmitting ? "Submitting..." : "Submit Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
