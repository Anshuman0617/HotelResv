/**
 * Photos for hotels and room types.
 *
 * The database stores no images, so pictures are picked from a fixed set in
 * public/images (Unsplash, see public/images/CREDITS.md). Each hotel and room
 * type always gets the same photo, chosen from its id.
 */

const HOTEL_PHOTOS = 10;
const ROOM_PHOTOS = 5;

export const HERO_IMAGE = "/images/hero.jpg";

function pick(id: number, count: number): number {
  return ((Math.abs(Math.trunc(id)) - 1) % count + count) % count + 1;
}

export function hotelImage(hotelId: number): string {
  return `/images/hotels/${pick(hotelId, HOTEL_PHOTOS)}.jpg`;
}

export function roomImage(roomTypeId: number): string {
  return `/images/rooms/${pick(roomTypeId, ROOM_PHOTOS)}.jpg`;
}
