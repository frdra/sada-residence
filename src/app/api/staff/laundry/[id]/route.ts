import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireStaffOrAdmin } from "@/lib/auth/staff";

export const dynamic = "force-dynamic";

// PATCH /api/staff/laundry/[id] — Update laundry status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireStaffOrAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { status } = body;

  const validStatuses = ["pending", "picked_up", "washing", "done", "delivered"];
  if (!status || !validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const admin = createAdminClient();

  const updateData: Record<string, unknown> = { status };
  if (status === "picked_up") updateData.picked_up_at = new Date().toISOString();
  if (status === "delivered") updateData.delivered_at = new Date().toISOString();

  const { data, error } = await admin
    .from("laundry_requests")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ request: data });
}
