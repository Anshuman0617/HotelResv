export default function SearchBar() {
  return (
    <form
      action="/hotels"
      className="grid w-full gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5"
    >
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Destination</span>
        <input
          name="city"
          type="text"
          placeholder="City"
          className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-indigo-600"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Check-in</span>
        <input
          name="check_in"
          type="date"
          className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-indigo-600"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Check-out</span>
        <input
          name="check_out"
          type="date"
          className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-indigo-600"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Guests</span>
        <input
          name="guests"
          type="number"
          min={1}
          defaultValue={1}
          className="rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-indigo-600"
        />
      </label>
      <button
        type="submit"
        className="self-end rounded-md bg-indigo-600 px-4 py-2 font-medium text-white transition-colors hover:bg-indigo-700"
      >
        Search
      </button>
    </form>
  );
}
