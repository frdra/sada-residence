import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRooms, updateRoomStatus } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const searchParams = request.nextUrl.searchParams;
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
