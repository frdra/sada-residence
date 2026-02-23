import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireStaffOrAdmin } from "@/lib/auth/staff";

export const dynamic = "force-dynamic";

// PATCH /api/staff/tasks/[id] — Update task status, checklist, etc.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireStaffOrAdmin();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { action, checklistItemId, checklistCompleted, checklistNotes, adminRating, adminNotes, rejectionReason } = body;

  const admin = createAdminClient();

  // Get current task
  const { data: task, error: fetchErr } = await admin
    .from("housekeeping_tasks")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr || !task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  // Action: start — mark in_progress
  if (action === "start") {
    const { error } = await admin
      .from("housekeeping_tasks")
      .update({ status: "in_progress", started_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Action: complete — mark completed/needs_review, calculate scores
  if (action === "complete") {
    const completedAt = new Date().toISOString();

    // Calculate checklist score
    const { data: checklist } = await admin
      .from("task_checklist")
      .select("is_completed, checklist_item:cleaning_checklist_items(is_required)")
      .eq("task_id", id);

    let checklistScore = 100;
    if (checklist && checklist.length > 0) {
      const requiredItems = checklist.filter((c: any) => c.checklist_item?.is_required);
      const completedRequired = requiredItems.filter((c: any) => c.is_completed);
      const allCompleted = checklist.filter((c: any) => c.is_completed);
      // Score: 70% based on required items, 30% based on all items
      const reqScore = requiredItems.length > 0 ? (completedRequired.length / requiredItems.length) * 100 : 100;
      const allScore = checklist.length > 0 ? (allCompleted.length / checklist.length) * 100 : 100;
      checklistScore = Math.round(reqScore * 0.7 + allScore * 0.3);
    }

    // Calculate photo score (has before + after = 100, missing = 50, none = 0)
    const { data: photos } = await admin
      .from("task_photos")
      .select("photo_type")
      .eq("task_id", id);

    let photoScore = 0;
    if (photos) {
      const hasBefore = photos.some((p: any) => p.photo_type === "before");
      const hasAfter = photos.some((p: any) => p.photo_type === "after");
      if (hasBefore && hasAfter) photoScore = 100;
      else if (hasBefore || hasAfter) photoScore = 50;
    }

    // Calculate time score (normal: 20-60 min per room)
    let timeScore = 100;
    if (task.started_at) {
      const durationMin = (new Date(completedAt).getTime() - new Date(task.started_at).getTime()) / 60000;
      if (durationMin < 10) timeScore = 40;       // too fast, suspicious
      else if (durationMin < 20) timeScore = 70;
      else if (durationMin <= 60) timeScore = 100; // ideal range
      else if (durationMin <= 90) timeScore = 80;
      else timeScore = 60;                         // too slow
    }

    const { error } = await admin
      .from("housekeeping_tasks")
      .update({
        status: "needs_review",
        completed_at: completedAt,
        checklist_score: checklistScore,
        photo_score: photoScore,
        time_score: timeScore,
        // Total without admin rating: avg of 3 scores
        total_score: Math.round((checklistScore * 0.4 + photoScore * 0.2 + timeScore * 0.2) * 100 / 80),
      })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, scores: { checklistScore, photoScore, timeScore } });
  }

  // Action: update_checklist — toggle a checklist item
  if (action === "update_checklist" && checklistItemId) {
    const { error } = await admin
      .from("task_checklist")
      .update({
        is_completed: checklistCompleted,
        completed_at: checklistCompleted ? new Date().toISOString() : null,
        notes: checklistNotes || null,
      })
      .eq("task_id", id)
      .eq("checklist_item_id", checklistItemId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Action: review (admin only) — approve or reject
  if (action === "review" && (user.role === "admin" || user.role === "super_admin")) {
    const newStatus = adminRating && adminRating >= 3 ? "approved" : "rejected";

    // Recalculate total with admin rating
    const adminScoreComponent = adminRating ? (adminRating / 5) * 100 : 0;
    const totalScore = Math.round(
      (task.checklist_score || 0) * 0.4 +
      (task.photo_score || 0) * 0.2 +
      (task.time_score || 0) * 0.2 +
      adminScoreComponent * 0.2
    );

    const { error } = await admin
      .from("housekeeping_tasks")
      .update({
        status: rejectionReason ? "rejected" : newStatus,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.userId,
        admin_rating: adminRating,
        admin_notes: adminNotes || null,
        rejection_reason: rejectionReason || null,
        total_score: totalScore,
      })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
