import Image from "next/image";
import Link from "next/link";
import type { Hotel } from "@/lib/types";
import { hotelImage } from "@/lib/images";

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
  const href = `/hotels/${hotel.id}${queryString}`;
  // Without dates, fall back to the cheapest listed room type.
  const listedFrom = hotel.room_types?.length
    ? Math.min(...hotel.room_types.map((rt) => Number(rt.base_price)))
    : null;
  const price = startingPrice ?? listedFrom;
  const region =
    hotel.state && hotel.state.toLowerCase() !== hotel.city.toLowerCase() ? hotel.state : null;

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-sand-100">
        <Image
          src={hotelImage(hotel.id)}
          alt=""
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className={`object-cover transition-transform duration-500 group-hover:scale-105 ${
            isFull ? "grayscale-[60%]" : ""
          }`}
        />
        <span className="absolute left-3 top-3">
          {isFull ? (
            <span className="rounded-full bg-sand-900/80 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              Fully booked
            </span>
          ) : availableRoomsCount !== undefined && availableRoomsCount > 0 ? (
            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-lagoon-700 backdrop-blur">
              {availableRoomsCount} room{availableRoomsCount > 1 ? "s" : ""} left
            </span>
          ) : null}
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-clay-600">
          {hotel.city}
          {region ? ` · ${region}` : ""}
        </p>
        <h2 className="text-xl font-semibold leading-snug text-sand-900">
          <Link href={href} className="hover:text-clay-700">
            {hotel.name}
          </Link>
        </h2>
        {hotel.description ? (
          <p className="line-clamp-2 text-sm text-sand-600">{hotel.description}</p>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div>
            {isFull ? (
              <span className="text-sm font-medium text-sand-500">No rooms for these dates</span>
            ) : price ? (
              <p className="leading-tight">
                <span className="block text-xs text-sand-500">From</span>
                <span className="font-display text-2xl font-semibold text-sand-900">
                  {formatPrice(price)}
                </span>
                <span className="text-sm text-sand-500"> / night</span>
              </p>
            ) : (
              <span className="text-sm text-sand-500">Rates vary by room</span>
            )}
          </div>
          <Link
            href={href}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              isFull
                ? "border border-sand-300 text-sand-700 hover:bg-sand-100"
                : "bg-clay-600 text-white hover:bg-clay-700"
            }`}
          >
            {isFull ? "View" : "View rooms"}
          </Link>
        </div>
      </div>
    </article>
  );
}
