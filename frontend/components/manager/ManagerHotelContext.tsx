"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiFetch } from "@/lib/api";
import {
  managerHotels,
  managerRoomTypes,
  managerRooms,
  type ManagerHotel,
  type PhysicalRoom,
  type PhysicalRoomInput,
  type RoomStatus,
  type RoomType,
  type RoomTypeInput,
} from "@/lib/manager/mock";

type ManagerHotelContextValue = {
  hotels: ManagerHotel[];
  selectedHotel: ManagerHotel;
  setSelectedHotelId: (hotelId: number) => void;
  roomTypes: RoomType[];
  rooms: PhysicalRoom[];
  loading: boolean;
  refreshHotelData: () => Promise<void>;
  updateHotel: (
    hotelId: number,
    updates: Partial<Omit<ManagerHotel, "id" | "registered_by" | "created_at">>,
  ) => void;
  addRoomType: (hotelId: number, input: RoomTypeInput) => void;
  updateRoomType: (roomTypeId: number, input: RoomTypeInput) => void;
  removeRoomType: (roomTypeId: number) => boolean;
  addRoom: (hotelId: number, input: PhysicalRoomInput) => void;
  updateRoom: (roomId: number, input: PhysicalRoomInput) => void;
  updateRoomStatus: (roomId: number, status: RoomStatus) => void;
};

const ManagerHotelContext = createContext<ManagerHotelContextValue | null>(
  null,
);

export function ManagerHotelProvider({ children }: { children: ReactNode }) {
  const [selectedHotelId, setSelectedHotelId] = useState(managerHotels[0].id);
  const [hotelsList, setHotelsList] = useState<ManagerHotel[]>(managerHotels);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>(managerRoomTypes);
  const [rooms, setRooms] = useState<PhysicalRoom[]>(managerRooms);
  const [loading, setLoading] = useState(false);

  // 1. Fetch hotels from backend on mount
  useEffect(() => {
    apiFetch<ManagerHotel[]>("/api/hotels?limit=50")
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setHotelsList(data);
          setSelectedHotelId((prev) =>
            data.some((h) => h.id === prev) ? prev : data[0].id
          );
        }
      })
      .catch(() => {
        // Fallback to local default hotels if API is offline
      });
  }, []);

  // 2. Fetch room types and rooms when selectedHotelId changes
  const fetchRoomData = useCallback(async (hotelId: number) => {
    if (!hotelId) return;
    setLoading(true);

    try {
      const [rtData, rData] = await Promise.all([
        apiFetch<RoomType[]>(`/api/hotels/${hotelId}/room-types`).catch(() => null),
        apiFetch<PhysicalRoom[]>(`/api/hotels/${hotelId}/rooms`).catch(() => null),
      ]);

      if (rtData && Array.isArray(rtData)) {
        setRoomTypes(rtData);
      } else {
        // Filter fallback mock room types
        setRoomTypes(managerRoomTypes.filter((rt) => rt.hotel_id === hotelId));
      }

      if (rData && Array.isArray(rData)) {
        setRooms(rData);
      } else {
        // Filter fallback mock rooms
        setRooms(managerRooms.filter((r) => r.hotel_id === hotelId));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoomData(selectedHotelId);
  }, [selectedHotelId, fetchRoomData]);

  const value = useMemo<ManagerHotelContextValue>(() => {
    const selectedHotel =
      hotelsList.find((hotel) => hotel.id === selectedHotelId) ??
      hotelsList[0] ??
      managerHotels[0];

    return {
      hotels: hotelsList,
      selectedHotel,
      setSelectedHotelId,
      roomTypes,
      rooms,
      loading,
      refreshHotelData: () => fetchRoomData(selectedHotelId),
      updateHotel: async (hotelId, updates) => {
        // Optimistic local update
        setHotelsList((currentHotels) =>
          currentHotels.map((hotel) =>
            hotel.id === hotelId ? { ...hotel, ...updates } : hotel,
          ),
        );
        // Persist to backend
        try {
          await apiFetch(`/api/hotels/${hotelId}`, {
            method: "PUT",
            body: JSON.stringify(updates),
          });
        } catch {
          // Keep optimistic state
        }
      },
      addRoomType: async (hotelId, input) => {
        try {
          const created = await apiFetch<RoomType>(`/api/hotels/${hotelId}/room-types`, {
            method: "POST",
            body: JSON.stringify(input),
          });
          setRoomTypes((prev) => [...prev, created]);
        } catch {
          // Fallback local addition
          setRoomTypes((currentRoomTypes) => [
            ...currentRoomTypes,
            {
              ...input,
              id:
                currentRoomTypes.reduce(
                  (nextId, roomType) => Math.max(nextId, roomType.id),
                  0,
                ) + 1,
              hotel_id: hotelId,
              created_at: new Date().toISOString(),
            },
          ]);
        }
      },
      updateRoomType: async (roomTypeId, input) => {
        // Optimistic local update
        setRoomTypes((currentRoomTypes) =>
          currentRoomTypes.map((roomType) =>
            roomType.id === roomTypeId ? { ...roomType, ...input } : roomType,
          ),
        );
        // Persist to backend
        try {
          await apiFetch(`/api/hotels/${selectedHotelId}/room-types/${roomTypeId}`, {
            method: "PUT",
            body: JSON.stringify(input),
          });
        } catch {
          // Keep optimistic state
        }
      },
      removeRoomType: (roomTypeId) => {
        if (rooms.some((room) => room.room_type_id === roomTypeId)) {
          return false;
        }
        setRoomTypes((currentRoomTypes) =>
          currentRoomTypes.filter((roomType) => roomType.id !== roomTypeId),
        );
        return true;
      },
      addRoom: async (hotelId, input) => {
        try {
          const created = await apiFetch<PhysicalRoom>(`/api/hotels/${hotelId}/rooms`, {
            method: "POST",
            body: JSON.stringify(input),
          });
          setRooms((prev) => [...prev, created]);
        } catch {
          // Fallback local addition
          setRooms((currentRooms) => [
            ...currentRooms,
            {
              ...input,
              id:
                currentRooms.reduce(
                  (nextId, room) => Math.max(nextId, room.id),
                  0,
                ) + 1,
              hotel_id: hotelId,
            },
          ]);
        }
      },
      updateRoom: async (roomId, input) => {
        setRooms((currentRooms) =>
          currentRooms.map((room) =>
            room.id === roomId
              ? { ...room, ...input, hotel_id: room.hotel_id }
              : room,
          ),
        );
        try {
          await apiFetch(`/api/hotels/${selectedHotelId}/rooms/${roomId}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status: input.status }),
          });
        } catch {
          // Keep optimistic state
        }
      },
      updateRoomStatus: async (roomId, status: RoomStatus) => {
        setRooms((currentRooms) =>
          currentRooms.map((room) =>
            room.id === roomId ? { ...room, status } : room,
          ),
        );
        try {
          await apiFetch(`/api/hotels/${selectedHotelId}/rooms/${roomId}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status }),
          });
        } catch {
          // Keep optimistic state
        }
      },
    };
  }, [hotelsList, roomTypes, rooms, selectedHotelId, loading, fetchRoomData]);

  return (
    <ManagerHotelContext.Provider value={value}>
      {children}
    </ManagerHotelContext.Provider>
  );
}

export function useManagerHotel() {
  const value = useContext(ManagerHotelContext);
  if (!value) {
    throw new Error("useManagerHotel must be used within ManagerHotelProvider");
  }
  return value;
}
