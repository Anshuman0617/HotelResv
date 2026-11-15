"use client";

export interface SearchBarProps {
  defaultQuery?: string;
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

const fieldClass =
  "flex flex-col gap-0.5 rounded-xl px-4 py-2.5 transition-colors focus-within:bg-sand-100 hover:bg-sand-50";
const labelClass = "text-[11px] font-semibold uppercase tracking-[0.12em] text-sand-500";
const inputClass =
  "w-full bg-transparent text-[15px] font-medium text-sand-900 outline-none placeholder:font-normal placeholder:text-sand-400";

export default function SearchBar({
  defaultQuery = "",
  defaultCheckIn = todayStr(),
  defaultCheckOut = tomorrowStr(),
  defaultGuests = 1,
}: SearchBarProps) {
  return (
    <form
      action="/hotels"
      method="GET"
      className="grid w-full gap-1 rounded-2xl bg-white p-2 shadow-xl shadow-sand-950/10 ring-1 ring-sand-200 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_0.7fr_auto] lg:items-center"
    >
      <label className={fieldClass}>
        <span className={labelClass}>Where to?</span>
        <input
          name="q"
          type="search"
          defaultValue={defaultQuery}
          placeholder="City, hotel or area"
          className={inputClass}
        />
      </label>
      <label className={fieldClass}>
        <span className={labelClass}>Check-in</span>
        <input
          name="check_in"
          type="date"
          defaultValue={defaultCheckIn}
          min={todayStr()}
          className={inputClass}
        />
      </label>
      <label className={fieldClass}>
        <span className={labelClass}>Check-out</span>
        <input
          name="check_out"
          type="date"
          defaultValue={defaultCheckOut}
          min={todayStr()}
          className={inputClass}
        />
      </label>
      <label className={fieldClass}>
        <span className={labelClass}>Guests</span>
        <input
          name="guests"
          type="number"
          min={1}
          max={20}
          defaultValue={defaultGuests}
          className={inputClass}
        />
      </label>
      <button
        type="submit"
        className="m-1 rounded-xl bg-clay-600 px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-clay-700 sm:col-span-2 lg:col-span-1"
      >
        Search stays
      </button>
    </form>
  );
}
