import { createAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/templates";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Sada Residence";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

// ── Types ──

export interface CreateNotificationParams {
  targetRole: "admin" | "staff" | "guest";
  targetUserId?: string;
  type: string;
  title: string;
  message: string;
  icon?: string;
  referenceType?: "booking" | "payment" | "issue" | "attendance" | "expense";
  referenceId?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  sendEmail?: boolean; // also send email to admin
}

// ── Create in-app notification ──

export async function createNotification(params: CreateNotificationParams) {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("notifications")
    .insert({
      target_role: params.targetRole,
      target_user_id: params.targetUserId || null,
      type: params.type,
      title: params.title,
      message: params.message,
      icon: params.icon || "🔔",
      reference_type: params.referenceType || null,
      reference_id: params.referenceId || null,
      action_url: params.actionUrl || null,
      metadata: params.metadata || {},
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create notification:", error.message);
    return null;
  }

  // Optionally send email to admin
  if (params.sendEmail && ADMIN_EMAIL) {
    try {
      await sendAdminEmailNotification(params.title, params.message, params.actionUrl);
    } catch (err) {
      console.error("Admin email notification failed:", err);
    }
  }

  return data;
}

// ── Bulk create for all admins ──

export async function notifyAdmins(
  params: Omit<CreateNotificationParams, "targetRole">
) {
  return createNotification({ ...params, targetRole: "admin" });
}

// ── Predefined notification creators ──

export async function notifyNewBooking(booking: {
  id: string;
  booking_code: string;
  guest?: { full_name: string } | null;
  room?: { room_number: string; property?: { name: string } | null } | null;
  total_amount: number;
}) {
  const guestName = (booking.guest as any)?.full_name || "Tamu";
  const roomNumber = (booking.room as any)?.room_number || "";
  const propertyName = (booking.room as any)?.property?.name || "";

  return notifyAdmins({
    type: "new_booking",
    title: "Booking Baru Masuk",
    message: `${guestName} booking kamar ${roomNumber} di ${propertyName} (${booking.booking_code})`,
    icon: "📋",
    referenceType: "booking",
    referenceId: booking.id,
    actionUrl: `/admin/bookings`,
    sendEmail: true,
    metadata: { bookingCode: booking.booking_code, totalAmount: booking.total_amount },
  });
}

export async function notifyPaymentReceived(booking: {
  id: string;
  booking_code: string;
  guest?: { full_name: string } | null;
}, amount: number, method: string) {
  const guestName = (booking.guest as any)?.full_name || "Tamu";
  const fmtAmount = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

  return notifyAdmins({
    type: "payment_received",
    title: "Pembayaran Diterima",
    message: `${fmtAmount} dari ${guestName} (${booking.booking_code}) via ${method}`,
    icon: "💰",
    referenceType: "payment",
    referenceId: booking.id,
    actionUrl: `/admin/bookings`,
    sendEmail: true,
    metadata: { amount, method, bookingCode: booking.booking_code },
  });
}

export async function notifyCheckIn(booking: {
  id: string;
  booking_code: string;
  guest?: { full_name: string } | null;
  room?: { room_number: string; property?: { name: string } | null } | null;
}) {
  const guestName = (booking.guest as any)?.full_name || "Tamu";
  const roomNumber = (booking.room as any)?.room_number || "";

  return notifyAdmins({
    type: "check_in",
    title: "Tamu Check-In",
    message: `${guestName} check-in kamar ${roomNumber} (${booking.booking_code})`,
    icon: "🏨",
    referenceType: "booking",
    referenceId: booking.id,
    actionUrl: `/admin/bookings`,
  });
}

export async function notifyCheckOut(booking: {
  id: string;
  booking_code: string;
  guest?: { full_name: string } | null;
  room?: { room_number: string } | null;
}) {
  const guestName = (booking.guest as any)?.full_name || "Tamu";
  const roomNumber = (booking.room as any)?.room_number || "";

  return notifyAdmins({
    type: "check_out",
    title: "Tamu Check-Out",
    message: `${guestName} check-out kamar ${roomNumber} (${booking.booking_code})`,
    icon: "👋",
    referenceType: "booking",
    referenceId: booking.id,
    actionUrl: `/admin/bookings`,
  });
}

export async function notifyIssueReported(issue: {
  id: string;
  title: string;
  severity: string;
  room?: { room_number: string } | null;
  property?: { name: string } | null;
  reporter?: { full_name: string } | null;
}) {
  const staffName = (issue.reporter as any)?.full_name || "Staff";
  const roomNumber = (issue.room as any)?.room_number || "";
  const propertyName = (issue.property as any)?.name || "";
  const severityEmoji: Record<string, string> = {
    low: "🟢",
    medium: "🟡",
    high: "🟠",
    critical: "🔴",
  };

  return notifyAdmins({
    type: "issue_reported",
    title: `${severityEmoji[issue.severity] || "⚠️"} Kerusakan Dilaporkan`,
    message: `${staffName} melaporkan: ${issue.title} di kamar ${roomNumber} (${propertyName})`,
    icon: "🔧",
    referenceType: "issue",
    referenceId: issue.id,
    actionUrl: `/admin/housekeeping`,
    sendEmail: issue.severity === "high" || issue.severity === "critical",
    metadata: { severity: issue.severity },
  });
}

export async function notifyStaffLate(staff: {
  id: string;
  full_name: string;
  late_minutes: number;
  property_name?: string;
}) {
  return notifyAdmins({
    type: "staff_late",
    title: "Staff Terlambat",
    message: `${staff.full_name} terlambat ${staff.late_minutes} menit${staff.property_name ? ` (${staff.property_name})` : ""}`,
    icon: "⏰",
    referenceType: "attendance",
    referenceId: staff.id,
    actionUrl: `/admin/housekeeping/attendance`,
  });
}

export async function notifyStaffAbsent(staffNames: string[], date: string) {
  if (!staffNames.length) return null;

  return notifyAdmins({
    type: "staff_absent",
    title: "Staff Tidak Masuk",
    message: `${staffNames.length} staff tidak hadir hari ini: ${staffNames.join(", ")}`,
    icon: "❌",
    referenceType: "attendance",
    actionUrl: `/admin/housekeeping/attendance`,
    sendEmail: true,
    metadata: { date, absentCount: staffNames.length, names: staffNames },
  });
}

export async function notifyOnSitePayment(booking: {
  id: string;
  booking_code: string;
}, amount: number, method: string) {
  const fmtAmount = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

  return notifyAdmins({
    type: "onsite_payment",
    title: "Pembayaran di Lokasi",
    message: `${fmtAmount} diterima untuk ${booking.booking_code} via ${method}`,
    icon: "🏠",
    referenceType: "payment",
    referenceId: booking.id,
    actionUrl: `/admin/bookings`,
  });
}

// ── Admin email helper ──

async function sendAdminEmailNotification(title: string, message: string, actionUrl?: string) {
  if (!ADMIN_EMAIL) return;

  const link = actionUrl ? `${APP_URL}${actionUrl}` : `${APP_URL}/admin/overview`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
<div style="max-width:500px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
  <div style="background:#1a1a2e;color:#fff;padding:20px;text-align:center;">
    <h2 style="margin:0;font-size:18px;">${APP_NAME}</h2>
    <p style="margin:6px 0 0;color:#c9a96e;font-size:13px;">Admin Notification</p>
  </div>
  <div style="padding:20px;">
    <h3 style="margin:0 0 8px;color:#1a1a2e;">${title}</h3>
    <p style="color:#555;margin:0 0 16px;">${message}</p>
    <div style="text-align:center;">
      <a href="${link}" style="display:inline-block;background:#1a1a2e;color:#fff;text-decoration:none;padding:10px 24px;border-radius:6px;font-size:14px;font-weight:bold;">Lihat di Dashboard</a>
    </div>
  </div>
  <div style="background:#f5f5f5;padding:12px;text-align:center;color:#999;font-size:11px;">
    ${APP_NAME} — Admin Alert
  </div>
</div>
</body>
</html>`;

  await sendEmail(ADMIN_EMAIL, `[${APP_NAME}] ${title}`, html);
}
