import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// GET — Admin view: all staff attendance
export async function GET(request: NextRequest) {
  try {
    const admin = createAdminClient();
    const url = new URL(request.url);
    const date = url.searchParams.get("date") || new Date().toISOString().split("T")[0];
    const staffId = url.searchParams.get("staffId");
    const mode = url.searchParams.get("mode") || "daily"; // daily or summary

    if (mode === "summary") {
      // Monthly summary for all staff
      const month = url.searchParams.get("month") || new Date().toISOString().slice(0, 7); // YYYY-MM
      const startDate = `${month}-01`;
      const endDate = new Date(new Date(startDate).setMonth(new Date(startDate).getMonth() + 1)).toISOString().split("T")[0];

      const { data: attendance } = await admin
        .from("staff_attendance")
        .select("*, staff:staff_profiles(id, full_name)")
        .gte("date", startDate)
        .lt("date", endDate)
        .order("date", { ascending: false });

      // Get all staff
      const { data: allStaff } = await admin
        .from("staff_profiles")
        .select("id, full_name, is_active")
        .eq("is_active", true);

      // Calculate summary per staff
      const summaryMap: Record<string, any> = {};
      allStaff?.forEach((s) => {
        summaryMap[s.id] = {
          staffId: s.id,
          staffName: s.full_name,
          totalPresent: 0,
          totalLate: 0,
          totalAbsent: 0,
          totalEarlyLeave: 0,
          avgWorkMinutes: 0,
          totalLateMinutes: 0,
          records: [] as any[],
        };
      });

      attendance?.forEach((a: any) => {
        const sid = a.staff_id;
        if (summaryMap[sid]) {
          summaryMap[sid].records.push(a);
          if (a.status === "present" || a.status === "late") summaryMap[sid].totalPresent++;
          if (a.is_late) { summaryMap[sid].totalLate++; summaryMap[sid].totalLateMinutes += a.late_minutes || 0; }
          if (a.is_early_leave) summaryMap[sid].totalEarlyLeave++;
          if (a.work_duration_minutes) summaryMap[sid].avgWorkMinutes += a.work_duration_minutes;
        }
      });

      Object.values(summaryMap).forEach((s: any) => {
        if (s.totalPresent > 0) s.avgWorkMinutes = Math.round(s.avgWorkMinutes / s.totalPresent);
      });

      // Get settings
      const { data: settings } = await admin
        .from("attendance_settings")
        .select("*")
        .eq("is_active", true)
        .single();

      return NextResponse.json({
        summary: Object.values(summaryMap),
        month,
        settings,
      });
    }

    // Daily view
    let query = admin
      .from("staff_attendance")
      .select("*, staff:staff_profiles(id, full_name)")
      .eq("date", date)
      .order("clock_in", { ascending: true });

    if (staffId) query = query.eq("staff_id", staffId);

    const { data: attendance } = await query;

    // Get all active staff to show who is absent
    const { data: allStaff } = await admin
      .from("staff_profiles")
      .select("id, full_name, is_active")
      .eq("is_active", true);

    const { data: settings } = await admin
      .from("attendance_settings")
      .select("*")
      .eq("is_active", true)
      .single();

    return NextResponse.json({ attendance, allStaff, date, settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH — Admin update attendance (add notes, change status)
export async function PATCH(request: NextRequest) {
  try {
    const admin = createAdminClient();
    const body = await request.json();
    const { attendanceId, status, adminNotes } = body;

    if (!attendanceId) {
      return NextResponse.json({ error: "attendanceId required" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (status) updates.status = status;
    if (adminNotes !== undefined) updates.admin_notes = adminNotes;

    const { data, error } = await admin
      .from("staff_attendance")
      .update(updates)
      .eq("id", attendanceId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ attendance: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
