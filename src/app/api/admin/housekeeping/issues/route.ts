import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET — List all issues with filters
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const severity = searchParams.get("severity");
  const propertyId = searchParams.get("propertyId");

  const admin = createAdminClient();

  let query = admin
    .from("room_issues")
    .select(`
      *,
      room:rooms(id, room_number, floor),
      property:properties(id, name, slug),
      reporter:staff_profiles(id, full_name),
      photos:issue_photos(*)
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  if (status) query = query.eq("status", status);
  if (severity) query = query.eq("severity", severity);
  if (propertyId) query = query.eq("property_id", propertyId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ issues: data || [] });
}

// PATCH — Update issue status
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { issueId, status, resolutionNotes } = body;

  if (!issueId || !status) {
    return NextResponse.json({ error: "issueId and status required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const updateData: Record<string, unknown> = { status };
  if (status === "resolved") {
    updateData.resolved_at = new Date().toISOString();
    if (resolutionNotes) updateData.resolution_notes = resolutionNotes;
  }

  const { data, error } = await admin
    .from("room_issues")
    .update(updateData)
    .eq("id", issueId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ issue: data });
}
