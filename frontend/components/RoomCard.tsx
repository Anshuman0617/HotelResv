import type { RoomType } from "@/lib/types";

export default function RoomCard({ roomType }: { roomType: RoomType }) {
  return (
    <article className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">{roomType.name}</h3>
      <p className="text-sm text-slate-500">
        Up to {roomType.max_guests} guest{roomType.max_guests === 1 ? "" : "s"}
      </p>
      {roomType.description ? (
        <p className="text-sm text-slate-600">{roomType.description}</p>
      ) : null}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-lg font-semibold text-slate-900">
          ₹{roomType.base_price}
          <span className="text-sm font-normal text-slate-500"> / night</span>
        </span>
        <button
          type="button"
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          Select
        </button>
      </div>
    </article>
  );
}
