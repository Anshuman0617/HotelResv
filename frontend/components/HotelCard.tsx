import Link from "next/link";
import type { Hotel } from "@/lib/types";

export interface HotelCardProps {
  hotel: Hotel;
  isFull?: boolean;
  availableRoomsCount?: number;
  startingPrice?: number | null;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
}

function formatPrice(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function HotelCard({
  hotel,
  isFull,
  availableRoomsCount,
  startingPrice,
  checkIn,
  checkOut,
  guests = 1,
}: HotelCardProps) {
  const queryParams = new URLSearchParams();
  if (checkIn) queryParams.set("check_in", checkIn);
  if (checkOut) queryParams.set("check_out", checkOut);
  if (guests) queryParams.set("guests", String(guests));
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

  return (
    <article
      className={`flex flex-col gap-3 rounded-xl border p-5 shadow-sm transition-all ${
        isFull
          ? "border-rose-200 bg-rose-50/20 opacity-90"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">{hotel.name}</h2>
        {isFull ? (
          <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-rose-700">
            Fully Booked
          </span>
        ) : availableRoomsCount !== undefined && availableRoomsCount > 0 ? (
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
            {availableRoomsCount} room{availableRoomsCount > 1 ? "s" : ""} left
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-600">
            {hotel.status}
          </span>
        )}
      </div>

      <p className="text-sm text-slate-500">
        {hotel.city}
        {hotel.state ? `, ${hotel.state}` : ""}, {hotel.country}
      </p>

      {hotel.description ? (
        <p className="line-clamp-2 text-sm text-slate-600">{hotel.description}</p>
      ) : null}

      <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
        <div>
          {isFull ? (
            <span className="text-xs font-medium text-rose-600">
              No rooms available
            </span>
          ) : startingPrice ? (
            <div>
              <span className="text-xs text-slate-400">From </span>
              <span className="text-base font-bold text-slate-900">
                {formatPrice(startingPrice)}
              </span>
              <span className="text-xs text-slate-500"> / night</span>
            </div>
          ) : (
            <span className="text-xs text-slate-400">Rates vary by room</span>
          )}
        </div>

        <Link
          href={`/hotels/${hotel.id}${queryString}`}
          className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            isFull
              ? "border border-rose-300 text-rose-700 hover:bg-rose-100/50"
              : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
          }`}
        >
          {isFull ? "View Hotel (Full)" : "View rooms"}
        </Link>
      </div>
    </article>
  );
}
