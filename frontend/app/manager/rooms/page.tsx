"use client";

import { useMemo, useState, type FormEvent } from "react";
import ManagerModal from "@/components/manager/ManagerModal";
import { useManagerHotel } from "@/components/manager/ManagerHotelContext";
import {
  roomStatuses,
  type PhysicalRoom,
  type PhysicalRoomInput,
  type RoomStatus,
} from "@/lib/manager/mock";

const statusStyles: Record<RoomStatus, string> = {
  active: "bg-emerald-50 text-emerald-700",
  maintenance: "bg-amber-50 text-amber-700",
  inactive: "bg-slate-100 text-slate-700",
};

const inputClass =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

export default function ManagerRoomsPage() {
  const {
    selectedHotel,
    roomTypes,
    rooms,
    addRoom,
    updateRoom,
    updateRoomStatus,
  } = useManagerHotel();
  const [statusFilter, setStatusFilter] = useState<"all" | RoomStatus>("all");
  const [roomSearch, setRoomSearch] = useState("");
  const [editingRoom, setEditingRoom] = useState<PhysicalRoom | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formHotelId, setFormHotelId] = useState<number | null>(null);
  const [formError, setFormError] = useState("");

  const hotelRooms = useMemo(
    () => rooms.filter((room) => room.hotel_id === selectedHotel.id),
    [rooms, selectedHotel.id],
  );
  const hotelRoomTypes = useMemo(
    () => roomTypes.filter((roomType) => roomType.hotel_id === selectedHotel.id),
    [roomTypes, selectedHotel.id],
  );
  const visibleRooms = useMemo(() => {
    const query = roomSearch.trim().toLocaleLowerCase();
    return hotelRooms.filter((room) => {
      const matchesStatus = statusFilter === "all" || room.status === statusFilter;
      const matchesSearch = room.room_number.toLocaleLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [hotelRooms, roomSearch, statusFilter]);
  const typeNames = useMemo(
    () => new Map(roomTypes.map((roomType) => [roomType.id, roomType.name])),
    [roomTypes],
  );

  function closeForm() {
    setEditingRoom(null);
    setIsAdding(false);
    setFormHotelId(null);
    setFormError("");
  }

  function submitRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (formHotelId === null) return;

    const formData = new FormData(event.currentTarget);
    const roomNumber = String(formData.get("room_number")).trim();
    const roomTypeId = Number(formData.get("room_type_id"));
    const floorValue = String(formData.get("floor")).trim();
    const floor = floorValue ? Number(floorValue) : null;
    const status = roomStatuses.find(
      (value) => value === formData.get("status"),
    );
    const roomTypeIsValid = roomTypes.some(
      (roomType) =>
        roomType.id === roomTypeId && roomType.hotel_id === formHotelId,
    );

    if (
      !roomNumber ||
      roomNumber.length > 20 ||
      !roomTypeIsValid ||
      (floor !== null &&
        (!Number.isInteger(floor) || floor < -32768 || floor > 32767)) ||
      !status
    ) {
      setFormError("Enter a valid room number, room type, floor, and status.");
      return;
    }

    const duplicateRoomNumber = rooms.some(
      (room) =>
        room.hotel_id === formHotelId &&
        room.id !== editingRoom?.id &&
        room.room_number.toLocaleLowerCase() === roomNumber.toLocaleLowerCase(),
    );
    if (duplicateRoomNumber) {
      setFormError("This room number is already in use at the selected hotel.");
      return;
    }

    const input: PhysicalRoomInput = {
      room_number: roomNumber,
      room_type_id: roomTypeId,
      floor,
      status,
    };

    if (editingRoom) {
      updateRoom(editingRoom.id, input);
    } else {
      addRoom(formHotelId, input);
    }
    closeForm();
  }

  function openAddForm() {
    setFormError("");
    setFormHotelId(selectedHotel.id);
    setIsAdding(true);
  }

  function openEditForm(room: PhysicalRoom) {
    setFormError("");
    setFormHotelId(room.hotel_id);
    setEditingRoom(room);
  }

  const formRoomTypes = roomTypes.filter(
    (roomType) => roomType.hotel_id === formHotelId,
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-indigo-700">
            {selectedHotel.name}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Physical rooms
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Track room numbers, categories, floors, and operational status.
          </p>
        </div>
        <button
          type="button"
          onClick={openAddForm}
          disabled={!hotelRoomTypes.length}
          className="rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add physical room
        </button>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Search room number
            <input
              type="search"
              value={roomSearch}
              onChange={(event) => setRoomSearch(event.target.value)}
              placeholder="e.g. 201"
              className={inputClass}
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Filter by status
            <select
              value={statusFilter}
              onChange={(event) => {
                if (event.target.value === "all") {
                  setStatusFilter("all");
                  return;
                }
                const status = roomStatuses.find(
                  (value) => value === event.target.value,
                );
                if (status) setStatusFilter(status);
              }}
              className={inputClass}
            >
              <option value="all">All statuses</option>
              {roomStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Room inventory</h2>
          <p className="mt-1 text-sm text-slate-500">
            Showing {visibleRooms.length} of {hotelRooms.length} rooms
          </p>
        </div>
        {visibleRooms.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Room number</th>
                  <th className="px-5 py-3 font-medium">Room type</th>
                  <th className="px-5 py-3 font-medium">Floor</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRooms.map((room) => (
                  <tr key={room.id}>
                    <td className="px-5 py-4 font-medium text-slate-900">
                      {room.room_number}
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {typeNames.get(room.room_type_id) ?? "Unknown room type"}
                    </td>
                    <td className="px-5 py-4 text-slate-700">
                      {room.floor ?? "—"}
                    </td>
                    <td className="px-5 py-4">
                      <label className="sr-only" htmlFor={`room-status-${room.id}`}>
                        Status for room {room.room_number}
                      </label>
                      <select
                        id={`room-status-${room.id}`}
                        value={room.status}
                        onChange={(event) => {
                          const status = roomStatuses.find(
                            (value) => value === event.target.value,
                          );
                          if (status) updateRoomStatus(room.id, status);
                        }}
                        className={`rounded-full border-0 px-3 py-1.5 text-xs font-semibold capitalize outline-none focus:ring-2 focus:ring-indigo-300 ${statusStyles[room.status]}`}
                      >
                        {roomStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => openEditForm(room)}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <p className="font-medium text-slate-900">
              {hotelRooms.length ? "No rooms match those filters" : "No physical rooms yet"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {hotelRooms.length
                ? "Try a different room number or status."
                : hotelRoomTypes.length
                  ? "Add a room to start tracking this hotel’s inventory."
                  : "Create a room type before adding physical rooms."}
            </p>
          </div>
        )}
      </section>

      {isAdding || editingRoom ? (
        <ManagerModal
          key={`${formHotelId}-${editingRoom?.id ?? "new"}`}
          title={editingRoom ? `Edit room ${editingRoom.room_number}` : "Add physical room"}
          onClose={closeForm}
        >
          {formRoomTypes.length ? (
            <form onSubmit={submitRoom} className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Room number
                <input
                  name="room_number"
                  required
                  maxLength={20}
                  defaultValue={editingRoom?.room_number ?? ""}
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Room type
                <select
                  name="room_type_id"
                  required
                  defaultValue={editingRoom?.room_type_id ?? formRoomTypes[0].id}
                  className={inputClass}
                >
                  {formRoomTypes.map((roomType) => (
                    <option key={roomType.id} value={roomType.id}>
                      {roomType.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Floor
                <input
                  name="floor"
                  type="number"
                  step={1}
                  min={-32768}
                  max={32767}
                  defaultValue={editingRoom?.floor ?? ""}
                  className={inputClass}
                />
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  Leave blank if the floor does not apply.
                </span>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Status
                <select
                  name="status"
                  defaultValue={editingRoom?.status ?? "active"}
                  className={inputClass}
                >
                  {roomStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              {formError ? (
                <p role="alert" className="text-sm text-rose-700 sm:col-span-2">
                  {formError}
                </p>
              ) : null}
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4 sm:col-span-2">
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
                  {editingRoom ? "Save changes" : "Add room"}
                </button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-slate-600">
              Add a room type to this hotel before creating or editing a physical room.
            </p>
          )}
        </ManagerModal>
      ) : null}
    </div>
  );
}
