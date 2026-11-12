"use client";

import { useMemo, useState, type FormEvent } from "react";
import ManagerModal from "@/components/manager/ManagerModal";
import { useManagerHotel } from "@/components/manager/ManagerHotelContext";
import type { RoomType, RoomTypeInput } from "@/lib/manager/mock";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

export default function ManagerRoomTypesPage() {
  const {
    selectedHotel,
    roomTypes,
    rooms,
    addRoomType,
    updateRoomType,
    removeRoomType,
  } = useManagerHotel();
  const [editingRoomType, setEditingRoomType] = useState<RoomType | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formHotelId, setFormHotelId] = useState<number | null>(null);
  const [formError, setFormError] = useState("");

  const hotelRoomTypes = useMemo(
    () => roomTypes.filter((roomType) => roomType.hotel_id === selectedHotel.id),
    [roomTypes, selectedHotel.id],
  );
  const formRoomTypes = roomTypes.filter(
    (roomType) => roomType.hotel_id === formHotelId,
  );

  function closeForm() {
    setEditingRoomType(null);
    setIsAdding(false);
    setFormHotelId(null);
    setFormError("");
  }

  function submitRoomType(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name")).trim();
    const maxGuests = Number(formData.get("max_guests"));
    const basePrice = Number(formData.get("base_price"));

    if (
      !name ||
      !Number.isInteger(maxGuests) ||
      maxGuests <= 0 ||
      maxGuests > 32767 ||
      !Number.isFinite(basePrice) ||
      basePrice <= 0 ||
      basePrice > 9999999999.99
    ) {
      setFormError("Enter a name, a positive whole number of guests, and a positive base price.");
      return;
    }

    const duplicate = formRoomTypes.some(
      (roomType) =>
        roomType.id !== editingRoomType?.id &&
        roomType.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
    );
    if (duplicate) {
      setFormError("A room type with this name already exists for the selected hotel.");
      return;
    }

    const input: RoomTypeInput = {
      name,
      description: String(formData.get("description")).trim() || null,
      max_guests: maxGuests,
      base_price: basePrice,
    };

    if (editingRoomType) {
      updateRoomType(editingRoomType.id, input);
    } else {
      if (formHotelId === null) return;
      addRoomType(formHotelId, input);
    }
    closeForm();
  }

  function deleteRoomType(roomType: RoomType) {
    if (!window.confirm(`Delete "${roomType.name}"? This cannot be undone.`)) {
      return;
    }
    if (!removeRoomType(roomType.id)) {
      window.alert("This room type is assigned to physical rooms and cannot be deleted.");
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-indigo-700">
            {selectedHotel.name}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Room types
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Manage the room categories, capacity, and nightly starting prices.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setFormError("");
            setFormHotelId(selectedHotel.id);
            setIsAdding(true);
          }}
          className="rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          Add room type
        </button>
      </header>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="font-semibold text-slate-900">Room categories</h2>
            <p className="mt-1 text-sm text-slate-500">
              {hotelRoomTypes.length} room type{hotelRoomTypes.length === 1 ? "" : "s"} at this hotel
            </p>
          </div>
        </div>
        {hotelRoomTypes.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Room type</th>
                  <th className="px-5 py-3 font-medium">Max guests</th>
                  <th className="px-5 py-3 font-medium">Base price / night</th>
                  <th className="px-5 py-3 font-medium">Physical rooms</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {hotelRoomTypes.map((roomType) => {
                  const roomCount = rooms.filter(
                    (room) => room.room_type_id === roomType.id,
                  ).length;
                  return (
                    <tr key={roomType.id} className="align-top">
                      <td className="px-5 py-4">
                        <p className="font-medium text-slate-900">
                          {roomType.name}
                        </p>
                        <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">
                          {roomType.description || "No description"}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {roomType.max_guests}
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-900">
                        {currency.format(roomType.base_price)}
                      </td>
                      <td className="px-5 py-4 text-slate-700">{roomCount}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setFormError("");
                              setFormHotelId(roomType.hotel_id);
                              setEditingRoomType(roomType);
                            }}
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteRoomType(roomType)}
                            className="rounded-md border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <p className="font-medium text-slate-900">No room types yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Add a room type to start organizing this hotel&apos;s inventory.
            </p>
          </div>
        )}
      </section>

      {isAdding || editingRoomType ? (
        <ManagerModal
          key={`${formHotelId}-${editingRoomType?.id ?? "new"}`}
          title={editingRoomType ? "Edit room type" : "Add room type"}
          onClose={closeForm}
        >
          <form onSubmit={submitRoomType} className="grid gap-4">
            <label className="text-sm font-medium text-slate-700">
              Room type name
              <input
                name="name"
                required
                maxLength={100}
                defaultValue={editingRoomType?.name ?? ""}
                className={inputClass}
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Description
              <textarea
                name="description"
                rows={3}
                defaultValue={editingRoomType?.description ?? ""}
                className={inputClass}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Maximum guests
                <input
                  type="number"
                  name="max_guests"
                  required
                  min={1}
                  max={32767}
                  step={1}
                  defaultValue={editingRoomType?.max_guests ?? ""}
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Base price per night (INR)
                <input
                  type="number"
                  name="base_price"
                  required
                  min="0.01"
                  max="9999999999.99"
                  step="0.01"
                  defaultValue={editingRoomType?.base_price ?? ""}
                  className={inputClass}
                />
              </label>
            </div>
            {formError ? (
              <p role="alert" className="text-sm text-rose-700">
                {formError}
              </p>
            ) : null}
            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                {editingRoomType ? "Save changes" : "Add room type"}
              </button>
            </div>
          </form>
        </ManagerModal>
      ) : null}
    </div>
  );
}
