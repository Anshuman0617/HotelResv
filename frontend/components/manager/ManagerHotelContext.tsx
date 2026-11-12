"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { managerHotels, type ManagerHotel } from "@/lib/manager/mock";

type ManagerHotelContextValue = {
  hotels: ManagerHotel[];
  selectedHotel: ManagerHotel;
  setSelectedHotelId: (hotelId: number) => void;
};

const ManagerHotelContext = createContext<ManagerHotelContextValue | null>(
  null,
);

export function ManagerHotelProvider({ children }: { children: ReactNode }) {
  const [selectedHotelId, setSelectedHotelId] = useState(managerHotels[0].id);

  const value = useMemo<ManagerHotelContextValue>(() => {
    const selectedHotel =
      managerHotels.find((hotel) => hotel.id === selectedHotelId) ??
      managerHotels[0];

    return {
      hotels: managerHotels,
      selectedHotel,
      setSelectedHotelId,
    };
  }, [selectedHotelId]);

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
