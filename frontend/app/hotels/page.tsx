"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { Hotel } from "@/lib/types";
import HotelCard from "@/components/HotelCard";

interface AvailableRoomTypeResult {
  hotel_id: number;
  hotel_name: string;
  city: string;
  room_type_id: number;
  room_type_name: string;
  max_guests: number;
  base_price: number;
  available_rooms_count: number;
}

interface HotelWithAvailability {
  hotel: Hotel;
  isFull: boolean;
  availableRoomsCount: number;
  startingPrice: number | null;
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 h-5 w-2/3 rounded bg-slate-200" />
      <div className="mb-2 h-4 w-1/3 rounded bg-slate-100" />
      <div className="mb-2 h-4 w-full rounded bg-slate-100" />
      <div className="h-4 w-1/4 rounded bg-slate-200" />
    </div>
  );
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function HotelsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [hotelCards, setHotelCards] = useState<HotelWithAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Read current query params
  const cityParam = searchParams.get("city") ?? "";
  const checkInParam = searchParams.get("check_in") || todayStr();
  const checkOutParam = searchParams.get("check_out") || tomorrowStr();
  const guestsParam = Math.max(1, parseInt(searchParams.get("guests") || "1", 10));

  const [cityInput, setCityInput] = useState(cityParam);
  const [checkInInput, setCheckInInput] = useState(checkInParam);
  const [checkOutInput, setCheckOutInput] = useState(checkOutParam);
  const [guestsInput, setGuestsInput] = useState(guestsParam);

  const performSearch = useCallback(
    async (city: string, checkIn: string, checkOut: string, guests: number) => {
      setLoading(true);
      setError(null);

      try {
        // 1. Fetch matching hotels
        const hotelsPath = city
          ? `/api/hotels?city=${encodeURIComponent(city)}&limit=100`
          : "/api/hotels?limit=100";
        const hotelsData = await apiFetch<Hotel[]>(hotelsPath);

        // 2. Fetch Query 1 availability for dates
        let availData: AvailableRoomTypeResult[] = [];
        try {
          const availQuery = new URLSearchParams({
            check_in: checkIn,
            check_out: checkOut,
            guests: String(guests),
          });
          if (city) availQuery.set("city", city);
          availData = await apiFetch<AvailableRoomTypeResult[]>(
            `/api/hotels/availability?${availQuery.toString()}`
          );
        } catch {
          // If availability check fails, fallback to empty array
          availData = [];
        }

        // 3. Map availability to each hotel
        const mapped: HotelWithAvailability[] = hotelsData.map((hotel) => {
          const hotelAvail = availData.filter((a) => a.hotel_id === hotel.id);
          const totalAvailable = hotelAvail.reduce(
            (sum, item) => sum + item.available_rooms_count,
            0
          );
          const startingPrice =
            hotelAvail.length > 0
              ? Math.min(...hotelAvail.map((item) => Number(item.base_price)))
              : null;

          return {
            hotel,
            isFull: totalAvailable === 0,
            availableRoomsCount: totalAvailable,
            startingPrice,
          };
        });

        // Sort available hotels first, then by lowest price
        mapped.sort((a, b) => {
          if (a.isFull !== b.isFull) return a.isFull ? 1 : -1;
          if (a.startingPrice && b.startingPrice) return a.startingPrice - b.startingPrice;
          return 0;
        });

        setHotelCards(mapped);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load hotels.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    performSearch(cityParam, checkInParam, checkOutParam, guestsParam);
  }, [cityParam, checkInParam, checkOutParam, guestsParam, performSearch]);

  function handleSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (cityInput.trim()) params.set("city", cityInput.trim());
    if (checkInInput) params.set("check_in", checkInInput);
    if (checkOutInput) params.set("check_out", checkOutInput);
    if (guestsInput > 1) params.set("guests", String(guestsInput));

    router.push(`/hotels?${params.toString()}`);
  }

  const availableCount = hotelCards.filter((h) => !h.isFull).length;
  const fullCount = hotelCards.filter((h) => h.isFull).length;

  return (
    <div>
      {/* Search Header Form */}
      <div className="mb-8">
        <h1 className="mb-6 text-3xl font-bold text-slate-900">Find your perfect stay</h1>
        <form
          onSubmit={handleSearchSubmit}
          className="grid w-full gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5"
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Destination</span>
            <input
              type="text"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              placeholder="e.g. Mumbai, Chennai"
              className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-indigo-600"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Check-in</span>
            <input
              type="date"
              value={checkInInput}
              min={todayStr()}
              onChange={(e) => setCheckInInput(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-indigo-600"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Check-out</span>
            <input
              type="date"
              value={checkOutInput}
              min={checkInInput || todayStr()}
              onChange={(e) => setCheckOutInput(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-indigo-600"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Guests</span>
            <input
              type="number"
              min={1}
              max={20}
              value={guestsInput}
              onChange={(e) => setGuestsInput(Math.max(1, parseInt(e.target.value) || 1))}
              className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-indigo-600"
            />
          </label>
          <button
            type="submit"
            className="self-end rounded-md bg-indigo-600 px-4 py-2 font-medium text-white transition-colors hover:bg-indigo-700 shadow-sm"
          >
            Search Hotels
          </button>
        </form>
      </div>

      {/* Results summary filter bar */}
      {!loading && !error && hotelCards.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 text-sm text-slate-600">
          <div>
            Showing <span className="font-semibold text-slate-900">{hotelCards.length}</span> hotel{hotelCards.length > 1 ? "s" : ""}
            {cityParam ? <> in <span className="font-semibold text-slate-900">{cityParam}</span></> : ""}
            {" for "}
            <span className="font-semibold text-slate-900">{checkInParam}</span> to <span className="font-semibold text-slate-900">{checkOutParam}</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {availableCount} Available
            </span>
            {fullCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 font-medium text-rose-700">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                {fullCount} Fully Booked
              </span>
            )}
          </div>
        </div>
      )}

      {/* Results Grid */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="text-rose-700">{error}</p>
          <button
            onClick={() => performSearch(cityParam, checkInParam, checkOutParam, guestsParam)}
            className="mt-3 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      ) : hotelCards.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-12 text-center">
          <p className="text-lg font-medium text-slate-600">No hotels found</p>
          <p className="mt-1 text-sm text-slate-500">
            {cityParam
              ? `No registered properties match "${cityParam}". Try searching for another city.`
              : "No hotels currently registered in the system."}
          </p>
          {cityParam && (
            <button
              onClick={() => router.push("/hotels")}
              className="mt-4 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {hotelCards.map(({ hotel, isFull, availableRoomsCount, startingPrice }) => (
            <HotelCard
              key={hotel.id}
              hotel={hotel}
              isFull={isFull}
              availableRoomsCount={availableRoomsCount}
              startingPrice={startingPrice}
              checkIn={checkInParam}
              checkOut={checkOutParam}
              guests={guestsParam}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function HotelsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-slate-100" />}>
        <HotelsContent />
      </Suspense>
    </main>
  );
}
