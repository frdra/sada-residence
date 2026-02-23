import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireStaffOrAdmin } from "@/lib/auth/staff";

export const dynamic = "force-dynamic";

// GET /api/staff/laundry — List laundry requests
export async function GET(request: NextRequest) {
  const user = await requireStaffOrAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const propertyId = searchParams.get("propertyId");

  const admin = createAdminClient();

  let query = admin
    .from("laundry_requests")
    .select(`
      *,
      room:rooms(id, room_number, floor),
      property:properties(id, name, slug),
      staff:staff_profiles(id, full_name)
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  if (status) query = query.eq("status", status);
  if (propertyId) query = query.eq("property_id", propertyId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ requests: data || [] });
}

// POST /api/staff/laundry — Create laundry request
export async function POST(request: NextRequest) {
  const user = await requireStaffOrAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { roomId, propertyId, bookingId, requestType, items, notes } = body;

  if (!roomId || !propertyId || !items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const totalItems = items.reduce((sum: number, item: { quantity: number }) => sum + (item.quantity || 0), 0);

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("laundry_requests")
    .insert({
      room_id: roomId,
      property_id: propertyId,
      booking_id: bookingId || null,
      requested_by: user.userId,
      request_type: requestType || "regular",
      items,
      total_items: totalItems,
      notes: notes || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ request: data });
}
