import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// POST — Record an on-site payment (cash/qris/transfer)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, amount, onSiteMethod, notes } = body;

    if (!bookingId || !amount || !onSiteMethod) {
      return NextResponse.json(
        { error: "bookingId, amount, and onSiteMethod are required" },
        { status: 400 }
      );
    }

    if (!["cash", "qris", "transfer"].includes(onSiteMethod)) {
      return NextResponse.json(
        { error: "onSiteMethod must be cash, qris, or transfer" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Get the booking
    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Create payment record
    const { data: payment, error: paymentError } = await admin
      .from("payments")
      .insert({
        booking_id: bookingId,
        amount,
        method: onSiteMethod === "transfer" ? "bank_transfer" : onSiteMethod,
        on_site_method: onSiteMethod,
        status: "paid",
        paid_at: new Date().toISOString(),
        notes: notes || null,
      })
      .select()
      .single();

    if (paymentError) {
      return NextResponse.json({ error: paymentError.message }, { status: 500 });
    }

    // Update booking paid_amount and payment_status
    const newPaidAmount = (booking.paid_amount || 0) + amount;
    const newPaymentStatus = newPaidAmount >= booking.total_amount ? "paid" : "partial";

    // Also confirm the booking if it was pending
    const statusUpdate: Record<string, unknown> = {
      paid_amount: newPaidAmount,
      payment_status: newPaymentStatus,
    };
    if (booking.status === "pending") {
      statusUpdate.status = "confirmed";
    }

    const { error: updateError } = await admin
      .from("bookings")
      .update(statusUpdate)
      .eq("id", bookingId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      payment,
      updatedBooking: {
        paid_amount: newPaidAmount,
        payment_status: newPaymentStatus,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
