"use client";

import { useState, type ReactNode } from "react";
import Sidebar from "@/components/manager/Sidebar";
import {
  ManagerHotelProvider,
  useManagerHotel,
} from "@/components/manager/ManagerHotelContext";

function ManagerFrame({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { hotels, selectedHotel, setSelectedHotelId } = useManagerHotel();

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-50">
      <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 md:hidden"
            onClick={() => setMenuOpen(true)}
          >
            Menu
          </button>
          <div className="ml-auto flex items-center gap-2">
            <label
              htmlFor="hotel-switcher"
              className="text-sm font-medium text-slate-600"
            >
              Hotel
            </label>
            <select
              id="hotel-switcher"
              value={selectedHotel.id}
              onChange={(event) =>
                setSelectedHotelId(Number(event.target.value))
              }
              className="max-w-[16rem] rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              {hotels.map((hotel) => (
                <option key={hotel.id} value={hotel.id}>
                  {hotel.name} · {hotel.city}
                </option>
              ))}
            </select>
          </div>
        </header>
        <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </div>
    </div>
  );
}

export default function ManagerLayout({ children }: { children: ReactNode }) {
  return (
    <ManagerHotelProvider>
      <ManagerFrame>{children}</ManagerFrame>
    </ManagerHotelProvider>
  );
}
