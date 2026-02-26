import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { notifyStaffAbsent } from "@/lib/notifications/service";

// Vercel Cron calls this daily at 11:00 AM WITA (03:00 UTC)
// See vercel.json → crons config

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret — Vercel sets this header automatically
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results: string[] = [];
    const admin = createAdminClient();

    // ─── Task 1: Detect absent staff ───
    // Find active staff who haven't clocked in by 11 AM today
    const today = new Date().toISOString().split("T")[0];

    // Get all active staff
    const { data: allStaff } = await admin
      .from("staff_profiles")
      .select("id, full_name")
      .eq("is_active", true);

    if (allStaff && allStaff.length > 0) {
      // Get today's attendance records
      const { data: todayAttendance } = await admin
        .from("staff_attendance")
        .select("staff_id")
        .eq("date", today);

      const presentIds = new Set((todayAttendance || []).map((a) => a.staff_id));
      const absentStaff = allStaff.filter((s) => !presentIds.has(s.id));

      if (absentStaff.length > 0) {
        const absentNames = absentStaff.map((s) => s.full_name);
        await notifyStaffAbsent(absentNames, today);

        // Create absent records in staff_attendance
        const absentRecords = absentStaff.map((s) => ({
          staff_id: s.id,
          date: today,
          status: "absent",
        }));

        await admin
          .from("staff_attendance")
          .upsert(absentRecords, {
            onConflict: "staff_id,date",
            ignoreDuplicates: true,
          });

        results.push(`Absent detection: ${absentStaff.length} staff absent (${absentNames.join(", ")})`);
      } else {
        results.push("Absent detection: all staff present");
      }
    } else {
      results.push("Absent detection: no active staff found");
    }

    // ─── Task 2: Cleanup old notifications (> 90 days) ───
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    const { count: deletedCount } = await admin
      .from("notifications")
      .delete({ count: "exact" })
      .lt("created_at", cutoffDate.toISOString());

    results.push(`Notification cleanup: ${deletedCount || 0} old notifications removed`);

    // ─── Task 3: Auto-expire pending bookings (> 24h without payment) ───
    const expiryCutoff = new Date();
    expiryCutoff.setHours(expiryCutoff.getHours() - 24);

    const { data: expiredBookings } = await admin
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("status", "pending")
      .eq("payment_status", "unpaid")
      .lt("created_at", expiryCutoff.toISOString())
      .neq("payment_method_type", "pay_at_property")
      .select("id");

    const expiredCount = expiredBookings?.length || 0;

    results.push(`Booking expiry: ${expiredCount || 0} pending bookings auto-cancelled`);

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      results,
    });
  } catch (error: any) {
    console.error("Daily cron error:", error);
    return NextResponse.json(
      { error: error.message || "Cron job failed" },
      { status: 500 }
    );
  }
}
