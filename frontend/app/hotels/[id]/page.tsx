"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { Hotel, RoomType, HotelStatus } from "@/lib/types";

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

interface AvailableRoomTypeResult {
  room_type_id: number;
  available_rooms_count: number;
}

const statusBadge: Record<HotelStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  active: "bg-emerald-100 text-emerald-700",
  suspended: "bg-rose-100 text-rose-700",
};

function formatPrice(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "";
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

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function HotelDetailContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const hotelId = params.id;

  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [reviewsData, setReviewsData] = useState<HotelReviewsData | null>(null);
  const [availabilityMap, setAvailabilityMap] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Date pickers for availability / booking link (prefilled from search params if provided)
  const [checkIn, setCheckIn] = useState(searchParams.get("check_in") || todayStr());
  const [checkOut, setCheckOut] = useState(searchParams.get("check_out") || tomorrowStr());
  const guests = parseInt(searchParams.get("guests") || "1", 10);

  // Fetch initial hotel details and room types
  useEffect(() => {
    if (!hotelId) return;
    setLoading(true);
    setError(null);

    Promise.all([
      apiFetch<Hotel>(`/api/hotels/${hotelId}`),
      apiFetch<RoomType[]>(`/api/hotels/${hotelId}/room-types`),
      apiFetch<HotelReviewsData>(`/api/hotels/${hotelId}/reviews`).catch(() => null),
    ])
      .then(([h, rt, rev]) => {
        setHotel(h);
        setRoomTypes(rt);
        setReviewsData(rev);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load hotel.");
      })
      .finally(() => setLoading(false));
  }, [hotelId]);

  // Fetch availability whenever dates change
  useEffect(() => {
    if (!hotelId || !checkIn || !checkOut || checkOut <= checkIn) return;
    setCheckingAvailability(true);

    apiFetch<AvailableRoomTypeResult[]>(
      `/api/hotels/${hotelId}/availability?check_in=${checkIn}&check_out=${checkOut}&guests=1`
    )
      .then((availList) => {
        const map: Record<number, number> = {};
        if (Array.isArray(availList)) {
          availList.forEach((item) => {
            map[item.room_type_id] = item.available_rooms_count;
          });
        }
        setAvailabilityMap(map);
      })
      .catch(() => {
        setAvailabilityMap({});
      })
      .finally(() => setCheckingAvailability(false));
  }, [hotelId, checkIn, checkOut]);

  function handleBook(roomTypeId: number) {
    const query = new URLSearchParams({
      hotel_id: hotelId,
      room_type_id: String(roomTypeId),
      check_in: checkIn,
      check_out: checkOut,
      guests: String(guests),
    });
    router.push(`/checkout?${query.toString()}`);
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/2 rounded bg-slate-200" />
          <div className="h-4 w-1/4 rounded bg-slate-100" />
          <div className="h-20 rounded bg-slate-100" />
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 rounded-xl bg-slate-200" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error || !hotel) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center">
          <p className="text-rose-700">{error ?? "Hotel not found."}</p>
          <button
            onClick={() => router.push("/hotels")}
            className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Back to hotels
          </button>
        </div>
      </main>
    );
  }

  // Check if all room types are full
  const allRoomsFull =
    roomTypes.length > 0 &&
    !checkingAvailability &&
    roomTypes.every((rt) => (availabilityMap[rt.id] ?? 0) === 0);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      {/* Hotel header */}
      <div>
        <div className="flex flex-wrap items-start gap-3">
          <h1 className="flex-1 text-3xl font-bold text-slate-900">{hotel.name}</h1>
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${statusBadge[hotel.status]}`}
          >
            {hotel.status}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
          <p>
            {hotel.city}
            {hotel.state ? `, ${hotel.state}` : ""}
            {", "}
            {hotel.country}
          </p>
          {reviewsData && reviewsData.total_reviews > 0 && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1 font-semibold text-amber-600">
                ★ {reviewsData.average_rating} ({reviewsData.total_reviews} review{reviewsData.total_reviews > 1 ? "s" : ""})
              </span>
            </>
          )}
        </div>
        {hotel.address_line && (
          <p className="mt-0.5 text-sm text-slate-400">{hotel.address_line}</p>
        )}
        {hotel.description && (
          <p className="mt-4 text-slate-600 leading-relaxed">{hotel.description}</p>
        )}
      </div>

      {/* Date pickers with availability notice */}
      <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700">Check-in</span>
              <input
                type="date"
                value={checkIn}
                min={todayStr()}
                onChange={(e) => setCheckIn(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-indigo-600 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700">Check-out</span>
              <input
                type="date"
                value={checkOut}
                min={checkIn}
                onChange={(e) => setCheckOut(e.target.value)}
                className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-indigo-600 text-sm"
              />
            </label>
          </div>
          {checkingAvailability && (
            <span className="text-xs text-indigo-600 flex items-center gap-1.5 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-indigo-600" />
              Checking live room availability...
            </span>
          )}
        </div>

        {allRoomsFull && (
          <div className="mt-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
            <span className="font-bold">⚠️ FULLY BOOKED:</span>
            <span>All rooms at this hotel are occupied for {checkIn} to {checkOut}. Try selecting other dates.</span>
          </div>
        )}
      </section>

      {/* Room types */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Room types</h2>
          <span className="text-xs text-slate-500">Live inventory for {checkIn} – {checkOut}</span>
        </div>

        {roomTypes.length === 0 ? (
          <p className="text-slate-500">No room types available for this hotel.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {roomTypes.map((rt) => {
              const availableCount = availabilityMap[rt.id] ?? 0;
              const isRoomFull = availableCount === 0;

              return (
                <article
                  key={rt.id}
                  className={`flex flex-col gap-3 rounded-xl border p-5 shadow-sm transition-all ${
                    isRoomFull
                      ? "border-rose-200 bg-rose-50/20"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold text-slate-900">{rt.name}</h3>
                    {isRoomFull ? (
                      <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700 uppercase">
                        Sold Out
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                        {availableCount} left
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-slate-500">
                    Up to {rt.max_guests} guest{rt.max_guests === 1 ? "" : "s"}
                  </p>
                  {rt.description && (
                    <p className="text-sm text-slate-600 line-clamp-2">{rt.description}</p>
                  )}

                  <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-lg font-semibold text-slate-900">
                      {formatPrice(rt.base_price)}
                      <span className="text-sm font-normal text-slate-500"> / night</span>
                    </span>
                    <button
                      type="button"
                      disabled={isRoomFull}
                      onClick={() => handleBook(rt.id)}
                      className={`rounded-md px-3.5 py-2 text-sm font-semibold transition-colors shadow-sm ${
                        isRoomFull
                          ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                          : "bg-indigo-600 text-white hover:bg-indigo-700"
                      }`}
                    >
                      {isRoomFull ? "Sold Out" : "Book this room"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Reviews & Ratings section */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Guest Reviews</h2>
            <p className="text-sm text-slate-500">Feedback from verified customers who stayed here</p>
          </div>
          {reviewsData && reviewsData.total_reviews > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 text-amber-900">
              <span className="text-xl font-bold">★ {reviewsData.average_rating}</span>
              <span className="text-xs text-amber-700">out of 5 ({reviewsData.total_reviews} review{reviewsData.total_reviews > 1 ? "s" : ""})</span>
            </div>
          )}
        </div>

        {reviewsData && reviewsData.reviews.length > 0 ? (
          <div className="mt-6 divide-y divide-slate-100">
            {reviewsData.reviews.map((rev) => (
              <div key={rev.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-800">{rev.user_name}</span>
                  <span className="text-xs text-slate-400">{formatDate(rev.created_at)}</span>
                </div>
                <div className="flex items-center text-amber-400 text-sm">
                  {"★".repeat(rev.rating)}
                  <span className="text-slate-200">{"★".repeat(5 - rev.rating)}</span>
                </div>
                {rev.comment && (
                  <p className="text-sm text-slate-600 leading-relaxed">{rev.comment}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-slate-500">
            No guest reviews yet for this property. Be the first to book and share your experience!
          </p>
        )}
      </section>
    </main>
  );
}

export default function HotelDetailPage() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-slate-100 max-w-4xl mx-auto my-10" />}>
      <HotelDetailContent />
    </Suspense>
  );
}
