import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getStaffUser } from "@/lib/auth/staff";

export const dynamic = "force-dynamic";

// GET — Get today's attendance + history
export async function GET(request: NextRequest) {
  try {
    const user = await getStaffUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const url = new URL(request.url);
    const mode = url.searchParams.get("mode") || "today";

    // Get shift settings
    const { data: settings } = await admin
      .from("attendance_settings")
      .select("*")
      .eq("is_active", true)
      .single();

    if (mode === "today") {
      const today = new Date().toISOString().split("T")[0];
      const { data: attendance } = await admin
        .from("staff_attendance")
        .select("*")
        .eq("staff_id", user.staffProfile?.id)
        .eq("date", today)
        .single();

      return NextResponse.json({ attendance, settings });
    }

    // History mode
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = 14; // 2 weeks
    const from = (page - 1) * limit;

    const { data: history, count } = await admin
      .from("staff_attendance")
      .select("*", { count: "exact" })
      .eq("staff_id", user.staffProfile?.id)
      .order("date", { ascending: false })
      .range(from, from + limit - 1);

    return NextResponse.json({ history, count, settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — Clock in or clock out
export async function POST(request: NextRequest) {
  try {
    const user = await getStaffUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const staffId = user.staffProfile?.id;
    if (!staffId) {
      return NextResponse.json({ error: "Staff profile not found" }, { status: 404 });
    }

    const admin = createAdminClient();

    // Parse multipart form data
    const formData = await request.formData();
    const action = formData.get("action") as string; // "clock_in" or "clock_out"
    const latitude = parseFloat(formData.get("latitude") as string);
    const longitude = parseFloat(formData.get("longitude") as string);
    const address = formData.get("address") as string || null;
    const propertyId = formData.get("propertyId") as string || null;
    const photo = formData.get("photo") as File | null;

    if (!action || !["clock_in", "clock_out"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json({ error: "GPS location is required" }, { status: 400 });
    }

    if (!photo) {
      return NextResponse.json({ error: "Photo is required" }, { status: 400 });
    }

    // Get shift settings
    const { data: settings } = await admin
      .from("attendance_settings")
      .select("*")
      .eq("is_active", true)
      .single();

    const shiftStart = settings?.shift_start || "08:00:00";
    const shiftEnd = settings?.shift_end || "17:00:00";
    const lateTolerance = settings?.late_tolerance_minutes || 15;

    const today = new Date().toISOString().split("T")[0];
    const now = new Date();

    // Upload photo to Supabase Storage
    const fileExt = photo.name?.split(".").pop() || "jpg";
    const fileName = `attendance/${staffId}/${today}_${action}.${fileExt}`;
    const arrayBuffer = await photo.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { error: uploadError } = await admin.storage
      .from("housekeeping-photos")
      .upload(fileName, buffer, {
        contentType: photo.type || "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error("Photo upload error:", uploadError);
      return NextResponse.json({ error: "Failed to upload photo" }, { status: 500 });
    }

    const { data: urlData } = admin.storage
      .from("housekeeping-photos")
      .getPublicUrl(fileName);
    const photoUrl = urlData.publicUrl;

    if (action === "clock_in") {
      // Check if already clocked in today
      const { data: existing } = await admin
        .from("staff_attendance")
        .select("id, clock_in")
        .eq("staff_id", staffId)
        .eq("date", today)
        .single();

      if (existing?.clock_in) {
        return NextResponse.json({ error: "Anda sudah absen masuk hari ini" }, { status: 409 });
      }

      // Calculate late status
      const [shiftH, shiftM] = shiftStart.split(":").map(Number);
      const shiftStartDate = new Date(now);
      shiftStartDate.setHours(shiftH, shiftM, 0, 0);
      const toleranceDate = new Date(shiftStartDate.getTime() + lateTolerance * 60000);

      const isLate = now > toleranceDate;
      const lateMinutes = isLate
        ? Math.round((now.getTime() - shiftStartDate.getTime()) / 60000)
        : 0;

      const attendanceData = {
        staff_id: staffId,
        date: today,
        clock_in: now.toISOString(),
        clock_in_photo_url: photoUrl,
        clock_in_latitude: latitude,
        clock_in_longitude: longitude,
        clock_in_address: address,
        clock_in_property_id: propertyId,
        is_late: isLate,
        late_minutes: lateMinutes,
        status: isLate ? "late" : "present",
      };

      if (existing) {
        // Update existing record
        const { data, error } = await admin
          .from("staff_attendance")
          .update(attendanceData)
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return NextResponse.json({ attendance: data, message: isLate ? `Terlambat ${lateMinutes} menit` : "Absen masuk berhasil" });
      } else {
        const { data, error } = await admin
          .from("staff_attendance")
          .insert(attendanceData)
          .select()
          .single();
        if (error) throw new Error(error.message);
        return NextResponse.json({ attendance: data, message: isLate ? `Terlambat ${lateMinutes} menit` : "Absen masuk berhasil" });
      }
    }

    if (action === "clock_out") {
      // Must have clocked in first
      const { data: existing } = await admin
        .from("staff_attendance")
        .select("*")
        .eq("staff_id", staffId)
        .eq("date", today)
        .single();

      if (!existing?.clock_in) {
        return NextResponse.json({ error: "Anda belum absen masuk hari ini" }, { status: 400 });
      }

      if (existing.clock_out) {
        return NextResponse.json({ error: "Anda sudah absen pulang hari ini" }, { status: 409 });
      }

      // Calculate work duration
      const clockInTime = new Date(existing.clock_in);
      const workDuration = Math.round((now.getTime() - clockInTime.getTime()) / 60000);

      // Check early leave
      const [endH, endM] = shiftEnd.split(":").map(Number);
      const shiftEndDate = new Date(now);
      shiftEndDate.setHours(endH, endM, 0, 0);
      const earlyTolerance = settings?.early_leave_tolerance_minutes || 15;
      const earlyLimit = new Date(shiftEndDate.getTime() - earlyTolerance * 60000);
      const isEarlyLeave = now < earlyLimit;

      const { data, error } = await admin
        .from("staff_attendance")
        .update({
          clock_out: now.toISOString(),
          clock_out_photo_url: photoUrl,
          clock_out_latitude: latitude,
          clock_out_longitude: longitude,
          clock_out_address: address,
          clock_out_property_id: propertyId,
          work_duration_minutes: workDuration,
          is_early_leave: isEarlyLeave,
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw new Error(error.message);

      const hours = Math.floor(workDuration / 60);
      const mins = workDuration % 60;

      return NextResponse.json({
        attendance: data,
        message: `Absen pulang berhasil. Durasi kerja: ${hours}j ${mins}m`,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Attendance error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
