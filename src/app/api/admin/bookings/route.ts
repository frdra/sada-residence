import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getBookings, updateBookingStatus } from "@/lib/db/queries";
import { notifyCheckOut } from "@/lib/notifications/service";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sp = request.nextUrl.searchParams;
    const result = await getBookings({
      propertyId: sp.get("propertyId") || undefined,
      status: sp.get("status") || undefined,
      paymentStatus: sp.get("paymentStatus") || undefined,
      search: sp.get("search") || undefined,
      page: sp.get("page") ? parseInt(sp.get("page")!) : 1,
      limit: sp.get("limit") ? parseInt(sp.get("limit")!) : 20,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { bookingId, status } = await request.json();
    if (!bookingId || !status) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const booking = await updateBookingStatus(bookingId, status);

    // On check-out: update room status back to "available" + notify
    if (status === "checked_out") {
      try {
        const admin = createAdminClient();
        const { data: fullBooking } = await admin
          .from("bookings")
          .select("id, booking_code, room_id, guest:guests(full_name), room:rooms(room_number)")
          .eq("id", bookingId)
          .single();

        // Set room back to available
        if (fullBooking?.room_id) {
          await admin
            .from("rooms")
            .update({ status: "available" })
            .eq("id", fullBooking.room_id);
        }

        // Also set checked_out_at timestamp
        await admin
          .from("bookings")
          .update({ checked_out_at: new Date().toISOString() })
          .eq("id", bookingId);

        if (fullBooking) {
          await notifyCheckOut(fullBooking as any);
        }
      } catch (err) {
        console.error("Check-out notification failed:", err);
      }
    }

    return NextResponse.json({ booking });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
