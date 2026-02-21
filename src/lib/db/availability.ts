import { createAdminClient } from "@/lib/supabase/server";
import type { AvailabilityResult, Room, RoomType, Property } from "@/types";

interface AvailabilityParams {
  checkIn: string;
  checkOut: string;
  propertyId?: string;
  roomTypeId?: string;
}

/**
 * Find available rooms for given dates.
 * Uses the database function for row-level locking safety.
 */
export async function findAvailableRooms(
  params: AvailabilityParams
): Promise<AvailabilityResult[]> {
  const supabase = createAdminClient();

  // Get all active rooms with their types and properties
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

  const { data: rooms, error } = await query;

  if (error) throw new Error(`Failed to fetch rooms: ${error.message}`);
  if (!rooms) return [];

  // Check each room's availability against bookings and blocks
  const results: AvailabilityResult[] = [];

  for (const room of rooms) {
    // Check for conflicting bookings
    const { count: bookingConflicts } = await supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("room_id", room.id)
      .not("status", "in", '("cancelled","no_show","checked_out")')
      .lt("check_in", params.checkOut)
      .gt("check_out", params.checkIn);

    // Check for availability blocks
    const { count: blockConflicts } = await supabase
      .from("availability_blocks")
      .select("id", { count: "exact", head: true })
      .eq("room_id", room.id)
      .lt("start_date", params.checkOut)
      .gt("end_date", params.checkIn);

    const isAvailable =
      (bookingConflicts ?? 0) === 0 && (blockConflicts ?? 0) === 0;

    if (isAvailable) {
      results.push({
        roomId: room.id,
        roomNumber: room.room_number,
        roomType: room.room_type as unknown as RoomType,
        property: room.property as unknown as Property,
        isAvailable: true,
      });
    }
  }

  return results;
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
