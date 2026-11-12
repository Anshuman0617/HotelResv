import Link from "next/link";
import type { Booking, BookingStatus } from "@/lib/types";

const statusStyles: Record<BookingStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-rose-100 text-rose-700",
  completed: "bg-slate-100 text-slate-700",
};

export default function BookingCard({ booking }: { booking: Booking }) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">
          Booking #{booking.id}
        </h2>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusStyles[booking.status]}`}
        >
          {booking.status}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-slate-500">Check-in</dt>
          <dd className="font-medium text-slate-900">{booking.check_in}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Check-out</dt>
          <dd className="font-medium text-slate-900">{booking.check_out}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Guests</dt>
          <dd className="font-medium text-slate-900">{booking.guest_count}</dd>
        </div>
      </dl>
      <Link
        href={`/bookings/${booking.id}`}
        className="text-sm font-medium text-indigo-700 hover:underline"
      >
        View details
      </Link>
    </article>
  );
}
