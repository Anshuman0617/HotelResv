"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { Hotel } from "@/lib/types";
import HotelCard from "@/components/HotelCard";

/** A few active hotels for the home page. Hidden if the API is unreachable. */
export default function FeaturedHotels({ limit = 6 }: { limit?: number }) {
  const [hotels, setHotels] = useState<Hotel[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch<Hotel[]>(`/api/hotels?limit=${limit}`).then(
      (data) => {
        if (!cancelled) setHotels(data);
      },
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [limit]);

  if (failed || (hotels && hotels.length === 0)) return null;

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {hotels
        ? hotels.map((hotel) => <HotelCard key={hotel.id} hotel={hotel} />)
        : Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-sand-200 bg-white">
              <div className="aspect-[4/3] animate-pulse bg-sand-100" />
              <div className="space-y-2 p-5">
                <div className="h-3 w-1/3 animate-pulse rounded bg-sand-100" />
                <div className="h-5 w-2/3 animate-pulse rounded bg-sand-200" />
              </div>
            </div>
          ))}
    </div>
  );
}
