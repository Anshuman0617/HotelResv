"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch } from "@/lib/api";
import { describeApiError, useApiData } from "@/lib/manager/useApiData";
import type {
  ManagerHotel,
  PhysicalRoom,
  PhysicalRoomInput,
  RoomStatus,
  RoomType,
  RoomTypeInput,
} from "@/lib/manager/types";
import { ErrorNotice, LoadingNotice } from "@/components/manager/LoadState";

type HotelUpdates = Partial<
  Omit<ManagerHotel, "id" | "registered_by" | "created_at" | "role">
>;

/**
 * Every action saves through the API and then reloads the affected data.
 * Actions reject with the API error, so callers can show it to the manager.
 */
type ManagerHotelContextValue = {
  hotels: ManagerHotel[];
  selectedHotel: ManagerHotel;
  setSelectedHotelId: (hotelId: number) => void;
  roomTypes: RoomType[];
  rooms: PhysicalRoom[];
  loading: boolean;
  /** Set when room types or rooms for the selected hotel failed to load. */
  inventoryError: string | null;
  updateHotel: (hotelId: number, updates: HotelUpdates) => Promise<void>;
  addRoomType: (hotelId: number, input: RoomTypeInput) => Promise<void>;
  updateRoomType: (roomTypeId: number, input: RoomTypeInput) => Promise<void>;
  addRoom: (hotelId: number, input: PhysicalRoomInput) => Promise<void>;
  updateRoomStatus: (roomId: number, status: RoomStatus) => Promise<void>;
};

const ManagerHotelContext = createContext<ManagerHotelContextValue | null>(
  null,
);

const jsonBody = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});

export function ManagerHotelProvider({ children }: { children: ReactNode }) {
  const hotelsRequest = useApiData<ManagerHotel[]>("/api/manager/hotels");
  const hotels = useMemo(() => hotelsRequest.data ?? [], [hotelsRequest.data]);
  const [chosenHotelId, setSelectedHotelId] = useState<number | null>(null);
  const selectedHotel =
    hotels.find((hotel) => hotel.id === chosenHotelId) ?? hotels[0] ?? null;
  const hotelId = selectedHotel?.id ?? null;

  const roomTypesRequest = useApiData<RoomType[]>(
    hotelId === null ? null : `/api/hotels/${hotelId}/room-types`,
  );
  const roomsRequest = useApiData<PhysicalRoom[]>(
    hotelId === null ? null : `/api/hotels/${hotelId}/rooms`,
  );

  const reloadHotels = hotelsRequest.reload;
  const reloadRoomTypes = roomTypesRequest.reload;
  const reloadRooms = roomsRequest.reload;
  const inventoryFailure = roomTypesRequest.error ?? roomsRequest.error;

  const value = useMemo<ManagerHotelContextValue | null>(() => {
    if (!selectedHotel) return null;
    return {
      hotels,
      selectedHotel,
      setSelectedHotelId,
      roomTypes: roomTypesRequest.data ?? [],
      rooms: roomsRequest.data ?? [],
      loading: roomTypesRequest.loading || roomsRequest.loading,
      inventoryError: inventoryFailure ? describeApiError(inventoryFailure) : null,
      updateHotel: async (id, updates) => {
        await apiFetch(`/api/hotels/${id}`, jsonBody("PUT", updates));
        reloadHotels();
      },
      addRoomType: async (id, input) => {
        await apiFetch(`/api/hotels/${id}/room-types`, jsonBody("POST", input));
        reloadRoomTypes();
      },
      updateRoomType: async (roomTypeId, input) => {
        await apiFetch(
          `/api/hotels/${selectedHotel.id}/room-types/${roomTypeId}`,
          jsonBody("PUT", input),
        );
        reloadRoomTypes();
      },
      addRoom: async (id, input) => {
        await apiFetch(`/api/hotels/${id}/rooms`, jsonBody("POST", input));
        reloadRooms();
      },
      updateRoomStatus: async (roomId, status) => {
        await apiFetch(
          `/api/hotels/${selectedHotel.id}/rooms/${roomId}/status`,
          jsonBody("PATCH", { status }),
        );
        reloadRooms();
      },
    };
  }, [
    hotels,
    selectedHotel,
    roomTypesRequest.data,
    roomTypesRequest.loading,
    roomsRequest.data,
    roomsRequest.loading,
    inventoryFailure,
    reloadHotels,
    reloadRoomTypes,
    reloadRooms,
  ]);

  if (hotelsRequest.error) {
    return (
      <ManagerGate>
        <ErrorNotice
          message={describeApiError(hotelsRequest.error)}
          onRetry={reloadHotels}
        />
      </ManagerGate>
    );
  }
  if (hotelsRequest.loading && !hotelsRequest.data) {
    return (
      <ManagerGate>
        <LoadingNotice label="Loading your hotels…" />
      </ManagerGate>
    );
  }
  if (!value) {
    return (
      <ManagerGate>
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">
            No hotels to manage
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Your account isn&apos;t an owner, manager or staff member of any
            hotel. Ask a hotel owner to add you.
          </p>
        </div>
      </ManagerGate>
    );
  }

  return (
    <ManagerHotelContext.Provider value={value}>
      {children}
    </ManagerHotelContext.Provider>
  );
}

function ManagerGate({ children }: { children: ReactNode }) {
  return <main className="mx-auto w-full max-w-xl px-4 py-16">{children}</main>;
}

export function useManagerHotel() {
  const value = useContext(ManagerHotelContext);
  if (!value) {
    throw new Error("useManagerHotel must be used within ManagerHotelProvider");
  }
  return value;
}
