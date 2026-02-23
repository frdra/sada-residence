import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireStaffOrAdmin } from "@/lib/auth/staff";

export const dynamic = "force-dynamic";

// GET /api/staff/tasks — List tasks for current staff
export async function GET(request: NextRequest) {
  const user = await requireStaffOrAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const status = searchParams.get("status");
  const propertyId = searchParams.get("propertyId");

  const admin = createAdminClient();

  let query = admin
    .from("housekeeping_tasks")
    .select(`
      *,
      room:rooms(id, room_number, floor, property_id),
      property:properties(id, name, slug),
      staff:staff_profiles(id, full_name),
      photos:task_photos(*),
      checklist:task_checklist(*, checklist_item:cleaning_checklist_items(*))
    `)
    .eq("task_date", date)
    .order("created_at", { ascending: true });

  // Staff only sees their own tasks; admin sees all
  if (user.role === "staff") {
    query = query.eq("assigned_to", user.userId);
  } else if (propertyId) {
    query = query.eq("property_id", propertyId);
  }

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ tasks: data || [] });
}

// POST /api/staff/tasks — Create a new task (admin can assign, staff can self-assign)
export async function POST(request: NextRequest) {
  const user = await requireStaffOrAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { roomId, propertyId, taskType, assignedTo, taskDate } = body;

  if (!roomId || !propertyId) {
    return NextResponse.json({ error: "roomId and propertyId required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Create task
  const { data: task, error: taskError } = await admin
    .from("housekeeping_tasks")
    .insert({
      room_id: roomId,
      property_id: propertyId,
      assigned_to: assignedTo || (user.role === "staff" ? user.userId : null),
      task_type: taskType || "occupied_clean",
      task_date: taskDate || new Date().toISOString().split("T")[0],
    })
    .select()
    .single();

  if (taskError) return NextResponse.json({ error: taskError.message }, { status: 500 });

  // Auto-create checklist items from master
  const { data: checklistItems } = await admin
    .from("cleaning_checklist_items")
    .select("id")
    .eq("is_active", true)
    .order("sort_order");

  if (checklistItems && checklistItems.length > 0) {
    const checklistRows = checklistItems.map((item: { id: string }) => ({
      task_id: task.id,
      checklist_item_id: item.id,
      is_completed: false,
    }));
    await admin.from("task_checklist").insert(checklistRows);
  }

  return NextResponse.json({ task });
}
