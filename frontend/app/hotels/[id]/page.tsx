"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { apiFetch } from "@/lib/api";
import { hotelImage, roomImage } from "@/lib/images";
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
  active: "bg-lagoon-100 text-lagoon-700",
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
          <div className="h-8 w-1/2 rounded bg-sand-200" />
          <div className="h-4 w-1/4 rounded bg-sand-100" />
          <div className="h-20 rounded bg-sand-100" />
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-40 rounded-xl bg-sand-200" />
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
            className="mt-4 rounded-md bg-clay-600 px-4 py-2 text-sm font-medium text-white hover:bg-clay-700"
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
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-10">
      {/* Hotel header: photo banner with the name over it */}
      <header className="relative isolate overflow-hidden rounded-3xl bg-sand-200">
        <div className="relative min-h-[22rem] sm:min-h-0 sm:aspect-[21/9]">
          <Image
            src={hotelImage(hotel.id)}
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 64rem, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-sand-950/85 via-sand-950/30 to-transparent" />
        </div>
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 p-6 sm:p-8">
          <div className="text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay-200">
              {hotel.city}
              {hotel.state && hotel.state.toLowerCase() !== hotel.city.toLowerCase() ? ` · ${hotel.state}` : ""}
              {` · ${hotel.country}`}
            </p>
            <h1 className="mt-2 text-3xl font-medium leading-tight sm:text-5xl">{hotel.name}</h1>
            {hotel.address_line && (
              <p className="mt-2 text-sm text-white/80">{hotel.address_line}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {reviewsData && reviewsData.total_reviews > 0 && (
              <span className="rounded-full bg-white/90 px-3.5 py-1.5 text-sm font-semibold text-sand-900 backdrop-blur">
                <span className="text-amber-500">★</span> {reviewsData.average_rating}
                <span className="font-normal text-sand-600">
                  {" "}· {reviewsData.total_reviews} review{reviewsData.total_reviews > 1 ? "s" : ""}
                </span>
              </span>
            )}
            {hotel.status !== "active" && (
              <span
                className={`rounded-full px-3 py-1.5 text-sm font-medium capitalize ${statusBadge[hotel.status]}`}
              >
                {hotel.status}
              </span>
            )}
          </div>
        </div>
      </header>

      {hotel.description && (
        <p className="max-w-3xl font-display text-xl leading-relaxed text-sand-700">
          {hotel.description}
        </p>
      )}

      {/* Date pickers with availability notice */}
      <section className="flex flex-col gap-3 rounded-2xl border border-sand-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-sand-700">Check-in</span>
              <input
                type="date"
                value={checkIn}
                min={todayStr()}
                onChange={(e) => setCheckIn(e.target.value)}
                className="rounded-md border border-sand-300 px-3 py-2 text-sand-900 outline-none focus:border-clay-600 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-sand-700">Check-out</span>
              <input
                type="date"
                value={checkOut}
                min={checkIn}
                onChange={(e) => setCheckOut(e.target.value)}
                className="rounded-md border border-sand-300 px-3 py-2 text-sand-900 outline-none focus:border-clay-600 text-sm"
              />
            </label>
          </div>
          {checkingAvailability && (
            <span className="text-xs text-clay-600 flex items-center gap-1.5 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-clay-600" />
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
          <h2 className="text-3xl font-medium text-sand-900">Choose your room</h2>
          <span className="text-xs text-sand-500">Live inventory for {checkIn} – {checkOut}</span>
        </div>

        {roomTypes.length === 0 ? (
          <p className="text-sand-500">No room types available for this hotel.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {roomTypes.map((rt) => {
              const availableCount = availabilityMap[rt.id] ?? 0;
              const isRoomFull = availableCount === 0;

              return (
                <article
                  key={rt.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-sm"
                >
                  <div className="relative aspect-[3/2] bg-sand-100">
                    <Image
                      src={roomImage(rt.id)}
                      alt=""
                      fill
                      sizes="(min-width: 640px) 50vw, 100vw"
                      className={`object-cover ${isRoomFull ? "grayscale-[70%] opacity-80" : ""}`}
                    />
                    <span className="absolute left-3 top-3">
                      {isRoomFull ? (
                        <span className="rounded-full bg-sand-900/80 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                          Sold out
                        </span>
                      ) : (
                        <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-lagoon-700 backdrop-blur">
                          {availableCount} left
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-5">
                  <h3 className="font-display text-xl font-medium text-sand-900">{rt.name}</h3>

                  <p className="text-sm text-sand-500">
                    Up to {rt.max_guests} guest{rt.max_guests === 1 ? "" : "s"}
                  </p>
                  {rt.description && (
                    <p className="text-sm text-sand-600 line-clamp-2">{rt.description}</p>
                  )}

                  <div className="mt-auto flex items-center justify-between pt-3 border-t border-sand-100">
                    <span className="font-display text-2xl font-semibold text-sand-900">
                      {formatPrice(rt.base_price)}
                      <span className="font-sans text-sm font-normal text-sand-500"> / night</span>
                    </span>
                    <button
                      type="button"
                      disabled={isRoomFull}
                      onClick={() => handleBook(rt.id)}
                      className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${isRoomFull
                        ? "bg-sand-100 text-sand-400 cursor-not-allowed"
                        : "bg-clay-600 text-white hover:bg-clay-700"
                        }`}
                    >
                      {isRoomFull ? "Sold out" : "Book this room"}
                    </button>
                  </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Reviews & Ratings section */}
      <section className="rounded-2xl border border-sand-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sand-100 pb-4">
          <div>
            <h2 className="text-xl font-semibold text-sand-900">Guest Reviews</h2>
            <p className="text-sm text-sand-500">Feedback from verified customers who stayed here</p>
          </div>
          {reviewsData && reviewsData.total_reviews > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 text-amber-900">
              <span className="text-xl font-bold">★ {reviewsData.average_rating}</span>
              <span className="text-xs text-amber-700">out of 5 ({reviewsData.total_reviews} review{reviewsData.total_reviews > 1 ? "s" : ""})</span>
            </div>
          )}
        </div>

        {reviewsData && reviewsData.reviews.length > 0 ? (
          <div className="mt-6 divide-y divide-sand-100">
            {reviewsData.reviews.map((rev) => (
              <div key={rev.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-sand-800">{rev.user_name}</span>
                  <span className="text-xs text-sand-400">{formatDate(rev.created_at)}</span>
                </div>
                <div className="flex items-center text-amber-400 text-sm">
                  {"★".repeat(rev.rating)}
                  <span className="text-sand-200">{"★".repeat(5 - rev.rating)}</span>
                </div>
                {rev.comment && (
                  <p className="text-sm text-sand-600 leading-relaxed">{rev.comment}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-sand-500">
            No guest reviews yet for this property. Be the first to book and share your experience!
          </p>
        )}
      </section>
    </main>
  );
}

export default function HotelDetailPage() {
  return (
    <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-sand-100 max-w-4xl mx-auto my-10" />}>
      <HotelDetailContent />
    </Suspense>
  );
}
