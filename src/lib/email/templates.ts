import type { Booking } from "@/types";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Sada Residence";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function bookingConfirmationEmail(booking: Booking) {
  const room = booking.room as any;
  const guest = booking.guest as any;
  const roomType = room?.room_type?.name ?? "Room";
  const property = room?.property?.name ?? APP_NAME;

  return {
    subject: `Konfirmasi Booking ${booking.booking_code} — ${APP_NAME}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
  <div style="background:#1a1a2e;color:#fff;padding:24px;text-align:center;">
    <h1 style="margin:0;font-size:24px;">${APP_NAME}</h1>
    <p style="margin:8px 0 0;color:#c9a96e;">Konfirmasi Booking</p>
  </div>
  <div style="padding:24px;">
    <p>Halo <strong>${guest.full_name}</strong>,</p>
    <p>Terima kasih telah melakukan booking. Berikut detail reservasi Anda:</p>

    <div style="background:#faf8f5;border-radius:8px;padding:16px;margin:16px 0;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#666;">Kode Booking</td><td style="padding:6px 0;font-weight:bold;">${booking.booking_code}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Properti</td><td style="padding:6px 0;">${property}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Tipe Kamar</td><td style="padding:6px 0;">${roomType}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">No. Kamar</td><td style="padding:6px 0;">${room.room_number}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Check-in</td><td style="padding:6px 0;">${formatDate(booking.check_in)}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Check-out</td><td style="padding:6px 0;">${formatDate(booking.check_out)}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Tipe Stay</td><td style="padding:6px 0;text-transform:capitalize;">${booking.stay_type}</td></tr>
      </table>
    </div>

    <div style="background:#f0f2f7;border-radius:8px;padding:16px;margin:16px 0;">
      <h3 style="margin:0 0 12px;color:#1a1a2e;">Rincian Biaya</h3>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:4px 0;">Harga Kamar</td><td style="padding:4px 0;text-align:right;">${formatCurrency(booking.base_price)}</td></tr>
        <tr><td style="padding:4px 0;">Pajak (11%)</td><td style="padding:4px 0;text-align:right;">${formatCurrency(booking.tax_amount)}</td></tr>
        <tr><td style="padding:4px 0;">Biaya Layanan</td><td style="padding:4px 0;text-align:right;">${formatCurrency(booking.service_fee)}</td></tr>
        ${booking.discount_amount > 0 ? `<tr><td style="padding:4px 0;color:green;">Diskon</td><td style="padding:4px 0;text-align:right;color:green;">-${formatCurrency(booking.discount_amount)}</td></tr>` : ""}
        <tr style="border-top:2px solid #ddd;"><td style="padding:8px 0;font-weight:bold;font-size:18px;">Total</td><td style="padding:8px 0;text-align:right;font-weight:bold;font-size:18px;color:#b8943d;">${formatCurrency(booking.total_amount)}</td></tr>
      </table>
    </div>

    <div style="text-align:center;margin:24px 0;">
      <a href="${APP_URL}/booking/${booking.id}" style="display:inline-block;background:#1a1a2e;color:#fff;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:bold;">Lihat Detail Booking</a>
    </div>

    <p style="color:#888;font-size:13px;">Jika Anda memiliki pertanyaan, silakan hubungi kami melalui email atau WhatsApp.</p>
  </div>
  <div style="background:#f5f5f5;padding:16px;text-align:center;color:#999;font-size:12px;">
    &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
  </div>
</div>
</body>
</html>`,
  };
}

export function paymentSuccessEmail(booking: Booking, amount: number) {
  const guest = (booking.guest as any) ?? {};
  return {
    subject: `Pembayaran Berhasil — ${booking.booking_code} — ${APP_NAME}`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;">
  <div style="background:#1a1a2e;color:#fff;padding:24px;text-align:center;">
    <h1 style="margin:0;font-size:24px;">${APP_NAME}</h1>
    <p style="margin:8px 0 0;color:#4ade80;">Pembayaran Berhasil</p>
  </div>
  <div style="padding:24px;">
    <p>Halo <strong>${guest.full_name ?? "Pelanggan"}</strong>,</p>
    <p>Pembayaran sebesar <strong>${formatCurrency(amount)}</strong> untuk booking <strong>${booking.booking_code}</strong> telah berhasil diterima.</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${APP_URL}/booking/${booking.id}" style="display:inline-block;background:#1a1a2e;color:#fff;text-decoration:none;padding:12px 32px;border-radius:6px;font-weight:bold;">Lihat Detail Booking</a>
    </div>
  </div>
  <div style="background:#f5f5f5;padding:16px;text-align:center;color:#999;font-size:12px;">
    &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
  </div>
</div>
</body>
</html>`,
  };
}

export async function sendEmail(to: string, subject: string, html: string) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const EMAIL_FROM = process.env.EMAIL_FROM || `${APP_NAME} <noreply@sadaresidence.com>`;

  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email send");
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("Failed to send email:", error);
  }
}
