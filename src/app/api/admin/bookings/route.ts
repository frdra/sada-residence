import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBookings, updateBookingStatus } from "@/lib/db/queries";

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
    return NextResponse.json({ booking });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
