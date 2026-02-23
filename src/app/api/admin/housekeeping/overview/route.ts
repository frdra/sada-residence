import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "7d";

  const admin = createAdminClient();
  const today = new Date().toISOString().split("T")[0];

  const daysMap: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
  const days = daysMap[period] || 7;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const start = startDate.toISOString().split("T")[0];

  // Today's tasks
  const { data: todayTasks } = await admin
    .from("housekeeping_tasks")
    .select("id, status, total_score, assigned_to, property_id")
    .eq("task_date", today);

  const tasks = todayTasks || [];
  const todayStats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    inProgress: tasks.filter((t) => t.status === "in_progress").length,
    needsReview: tasks.filter((t) => t.status === "needs_review").length,
    completed: tasks.filter((t) => ["completed", "needs_review", "approved"].includes(t.status)).length,
    approved: tasks.filter((t) => t.status === "approved").length,
    rejected: tasks.filter((t) => t.status === "rejected").length,
  };

  // Period tasks for stats
  const { data: periodTasks } = await admin
    .from("housekeeping_tasks")
    .select("id, status, total_score, assigned_to, property_id, task_date, started_at, completed_at")
    .gte("task_date", start)
    .lte("task_date", today);

  const pTasks = periodTasks || [];
  const approvedTasks = pTasks.filter((t) => t.status === "approved" && t.total_score !== null);
  const avgScore = approvedTasks.length > 0
    ? Math.round(approvedTasks.reduce((sum, t) => sum + (t.total_score || 0), 0) / approvedTasks.length)
    : 0;

  // Staff performance
  const staffMap = new Map<string, { tasks: number; approved: number; rejected: number; totalScore: number; scoredCount: number }>();
  pTasks.forEach((t) => {
    if (!t.assigned_to) return;
    const s = staffMap.get(t.assigned_to) || { tasks: 0, approved: 0, rejected: 0, totalScore: 0, scoredCount: 0 };
    s.tasks++;
    if (t.status === "approved") s.approved++;
    if (t.status === "rejected") s.rejected++;
    if (t.total_score !== null) { s.totalScore += t.total_score; s.scoredCount++; }
    staffMap.set(t.assigned_to, s);
  });

  // Get staff names
  const staffIds = Array.from(staffMap.keys());
  let staffPerformance: any[] = [];
  if (staffIds.length > 0) {
    const { data: staffProfiles } = await admin
      .from("staff_profiles")
      .select("id, full_name")
      .in("id", staffIds);

    staffPerformance = staffIds.map((id) => {
      const s = staffMap.get(id)!;
      const profile = (staffProfiles || []).find((p: any) => p.id === id);
      return {
        staffId: id,
        fullName: profile?.full_name || "Unknown",
        tasks: s.tasks,
        approved: s.approved,
        rejected: s.rejected,
        avgScore: s.scoredCount > 0 ? Math.round(s.totalScore / s.scoredCount) : 0,
        rejectionRate: s.tasks > 0 ? Math.round((s.rejected / s.tasks) * 100) : 0,
      };
    });
  }

  // Open issues
  const { data: openIssues } = await admin
    .from("room_issues")
    .select("id, severity, status")
    .in("status", ["reported", "acknowledged", "in_progress"]);

  const issues = openIssues || [];
  const issueStats = {
    total: issues.length,
    critical: issues.filter((i) => i.severity === "critical").length,
    high: issues.filter((i) => i.severity === "high").length,
    medium: issues.filter((i) => i.severity === "medium").length,
    low: issues.filter((i) => i.severity === "low").length,
  };

  // Pending laundry
  const { data: pendingLaundry } = await admin
    .from("laundry_requests")
    .select("id")
    .in("status", ["pending", "picked_up", "washing"]);

  // Per-property stats
  const { data: properties } = await admin
    .from("properties")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("sort_order");

  const propertyStats = (properties || []).map((p: any) => {
    const propTasks = tasks.filter((t) => t.property_id === p.id);
    return {
      propertyId: p.id,
      propertyName: p.name,
      todayTasks: propTasks.length,
      completed: propTasks.filter((t) => ["completed", "needs_review", "approved"].includes(t.status)).length,
      pending: propTasks.filter((t) => t.status === "pending").length,
    };
  });

  return NextResponse.json({
    today: todayStats,
    period: { days, avgScore, totalTasks: pTasks.length },
    staffPerformance,
    issueStats,
    pendingLaundry: (pendingLaundry || []).length,
    propertyStats,
  });
}
