import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireStaffOrAdmin } from "@/lib/auth/staff";

export const dynamic = "force-dynamic";

// POST /api/staff/tasks/[id]/photos — Upload task photo
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireStaffOrAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: taskId } = await params;
  const formData = await request.formData();
  const photo = formData.get("photo") as File | null;
  const photoType = formData.get("photoType") as string; // before | after | issue
  const caption = formData.get("caption") as string | null;

  if (!photo || !photoType) {
    return NextResponse.json({ error: "photo and photoType required" }, { status: 400 });
  }

  if (!["before", "after", "issue"].includes(photoType)) {
    return NextResponse.json({ error: "Invalid photoType" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify task exists
  const { data: task } = await admin
    .from("housekeeping_tasks")
    .select("id")
    .eq("id", taskId)
    .single();

  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  // Upload to Supabase Storage
  const ext = photo.name.split(".").pop() || "jpg";
  const timestamp = Date.now();
  const filePath = `tasks/${taskId}/${photoType}_${timestamp}.${ext}`;

  const arrayBuffer = await photo.arrayBuffer();
  const { error: uploadErr } = await admin.storage
    .from("housekeeping-photos")
    .upload(filePath, arrayBuffer, {
      contentType: photo.type,
      upsert: false,
    });

  if (uploadErr) {
    return NextResponse.json({ error: "Upload failed: " + uploadErr.message }, { status: 500 });
  }

  // Get signed URL (1 year)
  const { data: urlData } = await admin.storage
    .from("housekeeping-photos")
    .createSignedUrl(filePath, 365 * 24 * 60 * 60);

  const photoUrl = urlData?.signedUrl || "";

  // Save record
  const { data: photoRecord, error: insertErr } = await admin
    .from("task_photos")
    .insert({
      task_id: taskId,
      photo_url: photoUrl,
      photo_type: photoType,
      caption: caption || null,
    })
    .select()
    .single();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  return NextResponse.json({ photo: photoRecord });
}
