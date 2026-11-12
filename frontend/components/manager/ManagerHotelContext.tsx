"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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
  const [hotels, setHotels] = useState(managerHotels);
  const [roomTypes, setRoomTypes] = useState(managerRoomTypes);
  const [rooms, setRooms] = useState(managerRooms);

  const value = useMemo<ManagerHotelContextValue>(() => {
    const selectedHotel =
      hotels.find((hotel) => hotel.id === selectedHotelId) ?? hotels[0];

    return {
      hotels,
      selectedHotel,
      setSelectedHotelId,
      roomTypes,
      rooms,
      updateHotel: (hotelId, updates) => {
        setHotels((currentHotels) =>
          currentHotels.map((hotel) =>
            hotel.id === hotelId ? { ...hotel, ...updates } : hotel,
          ),
        );
      },
      addRoomType: (hotelId, input) => {
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
      },
      updateRoomType: (roomTypeId, input) => {
        setRoomTypes((currentRoomTypes) =>
          currentRoomTypes.map((roomType) =>
            roomType.id === roomTypeId ? { ...roomType, ...input } : roomType,
          ),
        );
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
      addRoom: (hotelId, input) => {
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
      },
      updateRoom: (roomId, input) => {
        setRooms((currentRooms) =>
          currentRooms.map((room) =>
            room.id === roomId
              ? { ...room, ...input, hotel_id: room.hotel_id }
              : room,
          ),
        );
      },
      updateRoomStatus: (roomId, status: RoomStatus) => {
        setRooms((currentRooms) =>
          currentRooms.map((room) =>
            room.id === roomId ? { ...room, status } : room,
          ),
        );
      },
    };
  }, [hotels, roomTypes, rooms, selectedHotelId]);

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
