"use client";

import { useMemo, useState, type FormEvent } from "react";
import ManagerModal from "@/components/manager/ManagerModal";
import RoomHistory from "@/components/manager/RoomHistory";
import { useManagerHotel } from "@/components/manager/ManagerHotelContext";
import { ErrorNotice } from "@/components/manager/LoadState";
import { describeApiError } from "@/lib/manager/useApiData";
import {
  roomStatuses,
  type PhysicalRoomInput,
  type RoomStatus,
} from "@/lib/manager/types";

const statusStyles: Record<RoomStatus, string> = {
  active: "bg-lagoon-50 text-lagoon-700",
  maintenance: "bg-amber-50 text-amber-700",
  inactive: "bg-sand-100 text-sand-700",
};

const inputClass =
  "mt-1 w-full rounded-md border border-sand-300 bg-white px-3 py-2 text-sm text-sand-900 outline-none focus:border-clay-500 focus:ring-2 focus:ring-clay-100";

export default function ManagerRoomsPage() {
  const {
    selectedHotel,
    roomTypes,
    rooms,
    addRoom,
    updateRoomStatus,
    inventoryError,
  } = useManagerHotel();
  const [statusFilter, setStatusFilter] = useState<"all" | RoomStatus>("all");
  const [roomSearch, setRoomSearch] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [formHotelId, setFormHotelId] = useState<number | null>(null);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [historyRoomId, setHistoryRoomId] = useState<number | null>(null);
  // Room history shows guest contact details, which staff can't see.
  const canViewHistory = selectedHotel.role !== "staff";
  const historyRoom = rooms.find((room) => room.id === historyRoomId) ?? null;

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
    setIsAdding(false);
    setFormHotelId(null);
    setFormError("");
  }

  async function submitRoom(event: FormEvent<HTMLFormElement>) {
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

    setSaving(true);
    try {
      await addRoom(formHotelId, input);
      closeForm();
    } catch (error) {
      setFormError(describeApiError(error));
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(roomId: number, status: RoomStatus) {
    setStatusError("");
    try {
      await updateRoomStatus(roomId, status);
    } catch (error) {
      setStatusError(describeApiError(error));
    }
  }

  function openAddForm() {
    setFormError("");
    setFormHotelId(selectedHotel.id);
    setIsAdding(true);
  }

  const formRoomTypes = roomTypes.filter(
    (roomType) => roomType.hotel_id === formHotelId,
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-clay-700">
            {selectedHotel.name}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-sand-900 sm:text-3xl">
            Physical rooms
          </h1>
          <p className="mt-2 text-sm text-sand-600">
            Track room numbers, categories, floors, and operational status.
          </p>
        </div>
        <button
          type="button"
          onClick={openAddForm}
          disabled={!hotelRoomTypes.length}
          className="rounded-md bg-clay-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-clay-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add physical room
        </button>
      </header>

      {inventoryError ? <ErrorNotice message={inventoryError} /> : null}
      {statusError ? <ErrorNotice message={statusError} /> : null}

      <section className="rounded-xl border border-sand-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
          <label className="text-xs font-semibold uppercase tracking-wide text-sand-500">
            Search room number
            <input
              type="search"
              value={roomSearch}
              onChange={(event) => setRoomSearch(event.target.value)}
              placeholder="e.g. 201"
              className={inputClass}
            />
          </label>
          <label className="text-xs font-semibold uppercase tracking-wide text-sand-500">
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

      <section className="overflow-hidden rounded-xl border border-sand-200 bg-white shadow-sm">
        <div className="border-b border-sand-200 px-5 py-4">
          <h2 className="font-semibold text-sand-900">Room inventory</h2>
          <p className="mt-1 text-sm text-sand-500">
            Showing {visibleRooms.length} of {hotelRooms.length} rooms
          </p>
        </div>
        {visibleRooms.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-sand-50 text-xs uppercase tracking-wide text-sand-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Room number</th>
                  <th className="px-5 py-3 font-medium">Room type</th>
                  <th className="px-5 py-3 font-medium">Floor</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  {canViewHistory ? (
                    <th className="px-5 py-3 font-medium">
                      <span className="sr-only">Guests</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {visibleRooms.map((room) => (
                  <tr key={room.id}>
                    <td className="px-5 py-4 font-medium text-sand-900">
                      {room.room_number}
                    </td>
                    <td className="px-5 py-4 text-sand-700">
                      {typeNames.get(room.room_type_id) ?? "Unknown room type"}
                    </td>
                    <td className="px-5 py-4 text-sand-700">
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
                          if (status) void changeStatus(room.id, status);
                        }}
                        className={`rounded-full border-0 px-3 py-1.5 text-xs font-semibold capitalize outline-none focus:ring-2 focus:ring-clay-300 ${statusStyles[room.status]}`}
                      >
                        {roomStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    {canViewHistory ? (
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setHistoryRoomId(room.id)}
                          className="rounded-md border border-sand-300 px-3 py-1.5 text-xs font-medium text-sand-700 hover:bg-sand-50"
                        >
                          Guests
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <p className="font-medium text-sand-900">
              {hotelRooms.length ? "No rooms match those filters" : "No physical rooms yet"}
            </p>
            <p className="mt-1 text-sm text-sand-500">
              {hotelRooms.length
                ? "Try a different room number or status."
                : hotelRoomTypes.length
                  ? "Add a room to start tracking this hotel’s inventory."
                  : "Create a room type before adding physical rooms."}
            </p>
          </div>
        )}
      </section>

      {historyRoom ? (
        <ManagerModal
          title={`Room ${historyRoom.room_number} · guests`}
          onClose={() => setHistoryRoomId(null)}
        >
          <RoomHistory hotelId={selectedHotel.id} roomId={historyRoom.id} />
        </ManagerModal>
      ) : null}

      {isAdding ? (
        <ManagerModal
          key={formHotelId ?? "new"}
          title="Add physical room"
          onClose={closeForm}
        >
          {formRoomTypes.length ? (
            <form onSubmit={submitRoom} className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-sand-700">
                Room number
                <input
                  name="room_number"
                  required
                  maxLength={20}
                  defaultValue=""
                  className={inputClass}
                />
              </label>
              <label className="text-sm font-medium text-sand-700">
                Room type
                <select
                  name="room_type_id"
                  required
                  defaultValue={formRoomTypes[0].id}
                  className={inputClass}
                >
                  {formRoomTypes.map((roomType) => (
                    <option key={roomType.id} value={roomType.id}>
                      {roomType.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-sand-700">
                Floor
                <input
                  name="floor"
                  type="number"
                  step={1}
                  min={-32768}
                  max={32767}
                  defaultValue=""
                  className={inputClass}
                />
                <span className="mt-1 block text-xs font-normal text-sand-500">
                  Leave blank if the floor does not apply.
                </span>
              </label>
              <label className="text-sm font-medium text-sand-700">
                Status
                <select
                  name="status"
                  defaultValue="active"
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
              <div className="flex justify-end gap-3 border-t border-sand-200 pt-4 sm:col-span-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-md border border-sand-300 px-4 py-2 text-sm font-medium text-sand-700 hover:bg-sand-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-clay-600 px-4 py-2 text-sm font-semibold text-white hover:bg-clay-700 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Add room"}
                </button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-sand-600">
              Add a room type to this hotel before creating a physical room.
            </p>
          )}
        </ManagerModal>
      ) : null}
    </div>
  );
}
