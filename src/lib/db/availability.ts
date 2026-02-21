import { createAdminClient } from "@/lib/supabase/server";
import type { AvailabilityResult, RoomType, Property } from "@/types";

interface AvailabilityParams {
  checkIn: string;
  checkOut: string;
  propertyId?: string;
  roomTypeId?: string;
}

/**
 * Find available rooms for given dates.
 * Uses a single efficient query instead of per-room checks.
 */
export async function findAvailableRooms(
  params: AvailabilityParams
): Promise<AvailabilityResult[]> {
  const supabase = createAdminClient();

  // Step 1: Get all room IDs that have conflicting bookings
  const { data: bookedRoomIds } = await supabase
    .from("bookings")
    .select("room_id")
    .not("status", "in", '("cancelled","no_show","checked_out")')
    .lt("check_in", params.checkOut)
    .gt("check_out", params.checkIn);

  // Step 2: Get all room IDs that have availability blocks
  const { data: blockedRoomIds } = await supabase
    .from("availability_blocks")
    .select("room_id")
    .lt("start_date", params.checkOut)
    .gt("end_date", params.checkIn);

  // Combine unavailable room IDs
  const unavailableIds = new Set<string>([
    ...(bookedRoomIds?.map((r) => r.room_id) || []),
    ...(blockedRoomIds?.map((r) => r.room_id) || []),
  ]);

  // Step 3: Get all active available rooms, excluding unavailable ones
  let query = supabase
    .from("rooms")
    .select(
      `
      id, room_number, floor, status,
      room_type:room_types!inner(id, name, slug, description, max_guests, bed_type, room_size_sqm, amenities, images),
      property:properties!inner(id, name, slug, description, address, image_url, total_rooms)
    `
    )
    .eq("is_active", true)
    .eq("status", "available");

  if (params.propertyId) {
    query = query.eq("property_id", params.propertyId);
  }
  if (params.roomTypeId) {
    query = query.eq("room_type_id", params.roomTypeId);
  }

  // Exclude unavailable rooms
  if (unavailableIds.size > 0) {
    query = query.not("id", "in", `(${Array.from(unavailableIds).join(",")})`);
  }

  const { data: rooms, error } = await query.order("room_number").limit(50);

  if (error) throw new Error(`Failed to fetch rooms: ${error.message}`);
  if (!rooms) return [];

  return rooms.map((room) => ({
    roomId: room.id,
    roomNumber: room.room_number,
    roomType: room.room_type as unknown as RoomType,
    property: room.property as unknown as Property,
    isAvailable: true,
  }));
}

/**
 * Check if a specific room is available (uses DB function with row locking).
 */
export async function checkRoomAvailability(
  roomId: string,
  checkIn: string,
  checkOut: string,
  excludeBookingId?: string
): Promise<boolean> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("check_room_availability", {
    p_room_id: roomId,
    p_check_in: checkIn,
    p_check_out: checkOut,
    p_exclude_booking_id: excludeBookingId || null,
  });

  if (error) throw new Error(`Availability check failed: ${error.message}`);
  return data === true;
}
