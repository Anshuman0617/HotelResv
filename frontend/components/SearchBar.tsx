"use client";

export interface SearchBarProps {
  defaultCity?: string;
  defaultCheckIn?: string;
  defaultCheckOut?: string;
  defaultGuests?: number;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default function SearchBar({
  defaultCity = "",
  defaultCheckIn = todayStr(),
  defaultCheckOut = tomorrowStr(),
  defaultGuests = 1,
}: SearchBarProps) {
  return (
    <form
      action="/hotels"
      method="GET"
      className="grid w-full gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5"
    >
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Destination</span>
        <input
          name="city"
          type="text"
          defaultValue={defaultCity}
          placeholder="e.g. Mumbai, Chennai"
          className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-indigo-600"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Check-in</span>
        <input
          name="check_in"
          type="date"
          defaultValue={defaultCheckIn}
          min={todayStr()}
          className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-indigo-600"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Check-out</span>
        <input
          name="check_out"
          type="date"
          defaultValue={defaultCheckOut}
          min={todayStr()}
          className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-indigo-600"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Guests</span>
        <input
          name="guests"
          type="number"
          min={1}
          max={20}
          defaultValue={defaultGuests}
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
  );
}
