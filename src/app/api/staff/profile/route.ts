import { NextResponse } from "next/server";
import { requireStaffOrAdmin } from "@/lib/auth/staff";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/staff/profile — Get current staff profile and rooms
export async function GET() {
  const user = await requireStaffOrAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Get properties (all for admin, assigned for staff)
  let propertiesQuery = admin
    .from("properties")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("sort_order");

  if (user.role === "staff" && user.staffProfile?.assigned_property_id) {
    propertiesQuery = propertiesQuery.eq("id", user.staffProfile.assigned_property_id);
  }

  const { data: properties } = await propertiesQuery;

  // Get rooms for those properties
  const propertyIds = (properties || []).map((p: { id: string }) => p.id);
  let rooms: any[] = [];
  if (propertyIds.length > 0) {
    const { data } = await admin
      .from("rooms")
      .select("id, room_number, floor, property_id")
      .in("property_id", propertyIds)
      .eq("is_active", true)
      .order("room_number");
    rooms = data || [];
  }

  return NextResponse.json({
    user: {
      id: user.userId,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      staffProfile: user.staffProfile,
    },
    properties: properties || [],
    rooms,
  });
}
