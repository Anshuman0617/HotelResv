"use client";

import StatCard from "@/components/manager/StatCard";
import { useManagerHotel } from "@/components/manager/ManagerHotelContext";
import {
  getHotelDashboard,
  managerHotels,
  type ReservationStatus,
} from "@/lib/manager/mock";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const statusStyles: Record<ReservationStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  confirmed: "bg-indigo-50 text-indigo-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-600",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export default function ManagerPage() {
  const { selectedHotel } = useManagerHotel();
  const dashboard = getHotelDashboard(selectedHotel.id);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Dashboard
        </h1>
        <p className="text-sm text-slate-600">
          {selectedHotel.name} · {selectedHotel.city}
          <span className="mx-2 text-slate-300">/</span>
          <span className="capitalize">{selectedHotel.status}</span>
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total bookings"
          value={String(dashboard.totalBookings)}
          hint="All reservation statuses"
        />
        <StatCard
          label="Total revenue"
          value={currency.format(dashboard.totalRevenue)}
          hint="Successful payments"
        />
        <StatCard
          label="Available rooms"
          value={String(dashboard.availableRooms)}
          hint="Active rooms not held"
        />
        <StatCard
          label="Total hotels"
          value={String(managerHotels.length)}
          hint="Hotels on this account"
        />
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">
            Recent reservations
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Latest stays for the selected hotel.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Guest</th>
                <th className="px-5 py-3 font-medium">Stay</th>
                <th className="px-5 py-3 font-medium">Rooms</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dashboard.recentReservations.map((reservation) => (
                <tr key={reservation.id}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-900">
                      {reservation.guestName}
                    </p>
                    <p className="text-xs text-slate-500">#{reservation.id}</p>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-slate-600">
                    {formatDate(reservation.checkIn)} –{" "}
                    {formatDate(reservation.checkOut)}
                  </td>
                  <td className="px-5 py-3 text-slate-600">
                    {reservation.rooms}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusStyles[reservation.status]}`}
                    >
                      {reservation.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-medium text-slate-900">
                    {currency.format(reservation.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
