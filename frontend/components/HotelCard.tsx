import Link from "next/link";
import type { Hotel } from "@/lib/types";

export default function HotelCard({ hotel }: { hotel: Hotel }) {
  return (
    <article className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">{hotel.name}</h2>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-600">
          {hotel.status}
        </span>
      </div>
      <p className="text-sm text-slate-500">
        {hotel.city}
        {hotel.state ? `, ${hotel.state}` : ""}, {hotel.country}
      </p>
      {hotel.description ? (
        <p className="line-clamp-2 text-sm text-slate-600">{hotel.description}</p>
      ) : null}
      <Link
        href={`/hotels/${hotel.id}`}
        className="mt-2 text-sm font-medium text-indigo-700 hover:underline"
      >
        View rooms
      </Link>
    </article>
  );
}
