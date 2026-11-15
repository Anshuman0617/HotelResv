"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import type { Hotel } from "@/lib/types";
import HotelCard from "@/components/HotelCard";
import SearchBar from "@/components/SearchBar";

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
    <div className="animate-pulse rounded-xl border border-sand-200 bg-white p-5 shadow-sm">
      <div className="mb-3 h-5 w-2/3 rounded bg-sand-200" />
      <div className="mb-2 h-4 w-1/3 rounded bg-sand-100" />
      <div className="mb-2 h-4 w-full rounded bg-sand-100" />
      <div className="h-4 w-1/4 rounded bg-sand-200" />
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
  // "city" is still read so older links keep working.
  const queryParam = (searchParams.get("q") ?? searchParams.get("city") ?? "").trim();
  const checkInParam = searchParams.get("check_in") || todayStr();
  const checkOutParam = searchParams.get("check_out") || tomorrowStr();
  const guestsParam = Math.max(1, parseInt(searchParams.get("guests") || "1", 10));

  const performSearch = useCallback(
    async (query: string, checkIn: string, checkOut: string, guests: number) => {
      setLoading(true);
      setError(null);

      try {
        // 1. Fetch matching hotels. With a query the backend runs a fuzzy,
        //    ranked search, so the list arrives best match first.
        const hotelsQuery = new URLSearchParams({ limit: "100" });
        if (query) hotelsQuery.set("search", query);
        const hotelsData = await apiFetch<Hotel[]>(`/api/hotels?${hotelsQuery.toString()}`);
        if (hotelsData.length === 0) {
          setHotelCards([]);
          return;
        }

        // 2. Fetch Query 1 availability for dates, only for the hotels found
        let availData: AvailableRoomTypeResult[] = [];
        try {
          const availQuery = new URLSearchParams({
            check_in: checkIn,
            check_out: checkOut,
            guests: String(guests),
          });
          if (query) {
            for (const hotel of hotelsData) availQuery.append("hotel_ids", String(hotel.id));
          }
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

        // Available hotels first. Within that, a search keeps the backend's
        // relevance order (sort is stable); browsing sorts by lowest price.
        mapped.sort((a, b) => {
          if (a.isFull !== b.isFull) return a.isFull ? 1 : -1;
          if (!query && a.startingPrice && b.startingPrice) return a.startingPrice - b.startingPrice;
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
    performSearch(queryParam, checkInParam, checkOutParam, guestsParam);
  }, [queryParam, checkInParam, checkOutParam, guestsParam, performSearch]);

  const availableCount = hotelCards.filter((h) => !h.isFull).length;
  const fullCount = hotelCards.filter((h) => h.isFull).length;
  // Typos and near-misses score below 1; say so instead of implying an exact hit.
  const onlyCloseMatches =
    queryParam !== "" &&
    hotelCards.length > 0 &&
    hotelCards.every((h) => (h.hotel.search_score ?? 1) < 1);

  return (
    <div>
      {/* Search Header Form */}
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-clay-600">Stays</p>
        <h1 className="mb-6 mt-2 text-4xl font-medium text-sand-900">
          {queryParam ? <>Stays for &ldquo;{queryParam}&rdquo;</> : "Find your perfect stay"}
        </h1>
        <SearchBar
          key={`${queryParam}|${checkInParam}|${checkOutParam}|${guestsParam}`}
          defaultQuery={queryParam}
          defaultCheckIn={checkInParam}
          defaultCheckOut={checkOutParam}
          defaultGuests={guestsParam}
        />
      </div>

      {!loading && !error && onlyCloseMatches && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No exact match for <span className="font-semibold">&ldquo;{queryParam}&rdquo;</span>. Showing the closest matches.
        </div>
      )}

      {/* Results summary filter bar */}
      {!loading && !error && hotelCards.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-sand-200 pb-4 text-sm text-sand-600">
          <div>
            Showing <span className="font-semibold text-sand-900">{hotelCards.length}</span> hotel{hotelCards.length > 1 ? "s" : ""}
            {queryParam ? <> matching <span className="font-semibold text-sand-900">&ldquo;{queryParam}&rdquo;</span></> : ""}
            {" for "}
            <span className="font-semibold text-sand-900">{checkInParam}</span> to <span className="font-semibold text-sand-900">{checkOutParam}</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-lagoon-50 px-2.5 py-1 font-medium text-lagoon-700">
              <span className="h-1.5 w-1.5 rounded-full bg-lagoon-500" />
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
            onClick={() => performSearch(queryParam, checkInParam, checkOutParam, guestsParam)}
            className="mt-3 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      ) : hotelCards.length === 0 ? (
        <div className="rounded-xl border border-sand-200 bg-sand-50 p-12 text-center">
          <p className="text-lg font-medium text-sand-600">No hotels found</p>
          <p className="mt-1 text-sm text-sand-500">
            {queryParam
              ? `Nothing matches "${queryParam}", even allowing for typos. Try a city, state or hotel name.`
              : "No hotels currently registered in the system."}
          </p>
          {queryParam && (
            <button
              onClick={() => router.push("/hotels")}
              className="mt-4 rounded-md border border-sand-300 bg-white px-4 py-2 text-sm font-medium text-sand-700 hover:bg-sand-50"
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
      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-sand-100" />}>
        <HotelsContent />
      </Suspense>
    </main>
  );
}
