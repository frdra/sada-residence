import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getRooms, updateRoomStatus } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;

    // Mode: get active guest for a specific room
    const roomId = searchParams.get("roomId");
    if (roomId) {
      const admin = createAdminClient();
      const { data: booking } = await admin
        .from("bookings")
        .select(`
          id, booking_code, check_in, check_out, stay_type, total_amount,
          paid_amount, payment_status, checked_in_at,
          guest:guests(id, full_name, email, phone, id_type, id_number)
        `)
        .eq("room_id", roomId)
        .eq("status", "checked_in")
        .order("checked_in_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return NextResponse.json({ booking });
    }

    const rooms = await getRooms({
      propertyId: searchParams.get("propertyId") || undefined,
      roomTypeId: searchParams.get("roomTypeId") || undefined,
      status: searchParams.get("status") || undefined,
    });

    return NextResponse.json({ rooms });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { roomId, status } = await request.json();
    if (!roomId || !status) {
      return NextResponse.json({ error: "Missing roomId or status" }, { status: 400 });
    }

    await updateRoomStatus(roomId, status);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
