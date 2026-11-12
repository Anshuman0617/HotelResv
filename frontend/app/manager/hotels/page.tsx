"use client";

import { useState, type FormEvent } from "react";
import ManagerModal from "@/components/manager/ManagerModal";
import { useManagerHotel } from "@/components/manager/ManagerHotelContext";
import {
  hotelStatuses,
  type HotelStatus,
  type ManagerHotel,
} from "@/lib/manager/mock";

const statusStyles: Record<HotelStatus, string> = {
  pending: "bg-amber-50 text-amber-700",
  active: "bg-emerald-50 text-emerald-700",
  suspended: "bg-slate-100 text-slate-700",
};

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

function nullableValue(value: string) {
  const trimmed = value.trim();
  return trimmed || null;
}

export default function ManagerHotelsPage() {
  const { selectedHotel, updateHotel } = useManagerHotel();
  const [editingHotel, setEditingHotel] = useState<ManagerHotel | null>(null);
  const [formError, setFormError] = useState("");

  function openEditor() {
    setFormError("");
    setEditingHotel(selectedHotel);
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingHotel) return;

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name")).trim();
    const addressLine = String(formData.get("address_line")).trim();
    const city = String(formData.get("city")).trim();
    const country = String(formData.get("country")).trim();
    const timezone = String(formData.get("timezone")).trim();
    if (!name || !addressLine || !city || !country || !timezone) {
      setFormError("Complete all required profile fields before saving.");
      return;
    }

    updateHotel(editingHotel.id, {
      name,
      description: nullableValue(String(formData.get("description"))),
      address_line: addressLine,
      city,
      state: nullableValue(String(formData.get("state"))),
      country,
      postal_code: nullableValue(String(formData.get("postal_code"))),
      timezone,
    });
    setFormError("");
    setEditingHotel(null);
  }

  const address = [
    selectedHotel.address_line,
    selectedHotel.city,
    selectedHotel.state,
    selectedHotel.postal_code,
    selectedHotel.country,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-indigo-700">Property settings</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Hotel profile
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            View and update the profile for the hotel selected above.
          </p>
        </div>
        <button
          type="button"
          onClick={openEditor}
          className="rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          Edit profile
        </button>
      </header>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {selectedHotel.name}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{address}</p>
          </div>
          <span
            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusStyles[selectedHotel.status]}`}
          >
            {selectedHotel.status}
          </span>
        </div>

        <div className="grid gap-6 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Description
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {selectedHotel.description || "No description provided."}
            </p>
          </div>
          <Detail label="Address" value={selectedHotel.address_line} />
          <Detail label="City" value={selectedHotel.city} />
          <Detail label="State / region" value={selectedHotel.state || "—"} />
          <Detail label="Country" value={selectedHotel.country} />
          <Detail label="Postal code" value={selectedHotel.postal_code || "—"} />
          <Detail label="Timezone" value={selectedHotel.timezone} />
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Hotel status
            <select
              value={selectedHotel.status}
              onChange={(event) => {
                const status = hotelStatuses.find(
                  (value) => value === event.target.value,
                );
                if (status) updateHotel(selectedHotel.id, { status });
              }}
              className={inputClass}
            >
              {hotelStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {editingHotel ? (
        <ManagerModal
          title={`Edit ${editingHotel.name}`}
          onClose={() => {
            setEditingHotel(null);
            setFormError("");
          }}
        >
          <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">
              Hotel name
              <input
                name="name"
                required
                maxLength={180}
                defaultValue={editingHotel.name}
                className={inputClass}
              />
            </label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">
              Description
              <textarea
                name="description"
                rows={3}
                defaultValue={editingHotel.description ?? ""}
                className={inputClass}
              />
            </label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">
              Street address
              <input
                name="address_line"
                required
                maxLength={255}
                defaultValue={editingHotel.address_line}
                className={inputClass}
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              City
              <input
                name="city"
                required
                maxLength={100}
                defaultValue={editingHotel.city}
                className={inputClass}
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              State / region
              <input
                name="state"
                maxLength={100}
                defaultValue={editingHotel.state ?? ""}
                className={inputClass}
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Country
              <input
                name="country"
                required
                maxLength={100}
                defaultValue={editingHotel.country}
                className={inputClass}
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Postal code
              <input
                name="postal_code"
                maxLength={20}
                defaultValue={editingHotel.postal_code ?? ""}
                className={inputClass}
              />
            </label>
            <label className="text-sm font-medium text-slate-700 sm:col-span-2">
              Timezone
              <input
                name="timezone"
                required
                maxLength={64}
                defaultValue={editingHotel.timezone}
                className={inputClass}
              />
            </label>
            {formError ? (
              <p role="alert" className="text-sm text-rose-700 sm:col-span-2">
                {formError}
              </p>
            ) : null}
            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 sm:col-span-2">
              <button
                type="button"
                onClick={() => {
                  setEditingHotel(null);
                  setFormError("");
                }}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Save changes
              </button>
            </div>
          </form>
        </ManagerModal>
      ) : null}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1.5 text-sm text-slate-800">{value}</p>
    </div>
  );
}
