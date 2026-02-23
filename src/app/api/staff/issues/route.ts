import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireStaffOrAdmin } from "@/lib/auth/staff";

export const dynamic = "force-dynamic";

// GET /api/staff/issues — List issues
export async function GET(request: NextRequest) {
  const user = await requireStaffOrAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const propertyId = searchParams.get("propertyId");
  const status = searchParams.get("status");

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

  if (user.role === "staff") {
    query = query.eq("reported_by", user.userId);
  }

  if (propertyId) query = query.eq("property_id", propertyId);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ issues: data || [] });
}

// POST /api/staff/issues — Report a new issue
export async function POST(request: NextRequest) {
  const user = await requireStaffOrAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const roomId = formData.get("roomId") as string;
  const propertyId = formData.get("propertyId") as string;
  const issueType = formData.get("issueType") as string;
  const severity = formData.get("severity") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string | null;

  if (!roomId || !propertyId || !issueType || !title) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Create issue
  const { data: issue, error: issueErr } = await admin
    .from("room_issues")
    .insert({
      room_id: roomId,
      property_id: propertyId,
      reported_by: user.userId,
      issue_type: issueType,
      severity: severity || "medium",
      title,
      description: description || null,
    })
    .select()
    .single();

  if (issueErr) return NextResponse.json({ error: issueErr.message }, { status: 500 });

  // Upload photos if any
  const photos: File[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("photo") && value instanceof File) {
      photos.push(value);
    }
  }

  const photoRecords = [];
  for (const photo of photos) {
    const ext = photo.name.split(".").pop() || "jpg";
    const filePath = `issues/${issue.id}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;

    const arrayBuffer = await photo.arrayBuffer();
    await admin.storage
      .from("housekeeping-photos")
      .upload(filePath, arrayBuffer, { contentType: photo.type });

    const { data: urlData } = await admin.storage
      .from("housekeeping-photos")
      .createSignedUrl(filePath, 365 * 24 * 60 * 60);

    if (urlData?.signedUrl) {
      const { data: rec } = await admin
        .from("issue_photos")
        .insert({
          issue_id: issue.id,
          photo_url: urlData.signedUrl,
        })
        .select()
        .single();
      if (rec) photoRecords.push(rec);
    }
  }

  return NextResponse.json({ issue: { ...issue, photos: photoRecords } });
}
