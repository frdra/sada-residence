import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: bookings, error } = await admin
      .from("bookings")
      .select(
        `*, guest:guests(full_name, email, phone), room:rooms(room_number, property:properties(name), room_type:room_types(name))`
      )
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    // Build CSV
    const headers = [
      "Kode Booking",
      "Tamu",
      "Email",
      "Telepon",
      "Properti",
      "Tipe Kamar",
      "No. Kamar",
      "Check-in",
      "Check-out",
      "Tipe Stay",
      "Total",
      "Dibayar",
      "Status",
      "Status Bayar",
      "Tanggal Dibuat",
    ];

    const rows = (bookings || []).map((b: any) => [
      b.booking_code,
      b.guest?.full_name || "",
      b.guest?.email || "",
      b.guest?.phone || "",
      b.room?.property?.name || "",
      b.room?.room_type?.name || "",
      b.room?.room_number || "",
      b.check_in,
      b.check_out,
      b.stay_type,
      b.total_amount,
      b.paid_amount || 0,
      b.status,
      b.payment_status,
      new Date(b.created_at).toLocaleDateString("id-ID"),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r: any[]) =>
        r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="bookings-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
