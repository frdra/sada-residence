import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET /api/admin/housekeeping/tasks — All tasks with filters
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const status = searchParams.get("status");
  const propertyId = searchParams.get("propertyId");
  const staffId = searchParams.get("staffId");
  const limit = parseInt(searchParams.get("limit") || "50");

  const admin = createAdminClient();

  let query = admin
    .from("housekeeping_tasks")
    .select(`
      *,
      room:rooms(id, room_number, floor),
      property:properties(id, name, slug),
      staff:staff_profiles(id, full_name),
      photos:task_photos(*),
      checklist:task_checklist(*, checklist_item:cleaning_checklist_items(*))
    `)
    .order("task_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (date) query = query.eq("task_date", date);
  if (status) query = query.eq("status", status);
  if (propertyId) query = query.eq("property_id", propertyId);
  if (staffId) query = query.eq("assigned_to", staffId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ tasks: data || [] });
}
