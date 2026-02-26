import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { findOrCreateGuest, createBooking, createPayment } from "@/lib/db/queries";
import { getRateByTypeAndStay } from "@/lib/db/queries";
import { calculatePrice, suggestStayType } from "@/lib/db/pricing";
import { notifyNewBooking } from "@/lib/notifications/service";
import { differenceInDays } from "date-fns";

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const {
      roomId,
      checkIn,
      checkOut,
      numGuests,
      stayType,
      specialRequests,
      guestName,
      guestPhone,
      guestEmail,
      guestIdNumber,
      paymentMethodType, // online, dp_online, pay_at_property
      isPaid, // if true, mark as paid immediately (walk-in)
      paidAmount,
      paidMethod, // cash, qris, transfer
    } = body;

    if (!roomId || !checkIn || !checkOut || !guestName || !guestPhone) {
      return NextResponse.json(
        { error: "Data kamar, tanggal, nama dan telepon tamu wajib diisi" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // 1. Verify room exists & get property
    const { data: room, error: roomErr } = await admin
      .from("rooms")
      .select("*, property:properties(id, name)")
      .eq("id", roomId)
      .single();

    if (roomErr || !room) {
      return NextResponse.json({ error: "Kamar tidak ditemukan" }, { status: 404 });
    }

    // 2. Check availability
    const { data: conflict } = await admin
      .from("bookings")
      .select("id")
      .eq("room_id", roomId)
      .not("status", "in", '("cancelled","checked_out","no_show")')
      .lt("check_in", checkOut)
      .gt("check_out", checkIn)
      .limit(1)
      .maybeSingle();

    if (conflict) {
      return NextResponse.json(
        { error: "Kamar tidak tersedia untuk tanggal tersebut" },
        { status: 409 }
      );
    }

    // 3. Calculate pricing
    const nights = differenceInDays(new Date(checkOut), new Date(checkIn));
    const resolvedStayType = stayType || suggestStayType(nights);
    const roomTypeId = room.room_type_id;
    const propertyId = room.property_id;

    const rate = await getRateByTypeAndStay(roomTypeId, resolvedStayType, {
      roomId,
      propertyId,
    });
    if (!rate) {
      return NextResponse.json(
        { error: "Tidak ada tarif untuk tipe kamar dan tipe menginap ini" },
        { status: 400 }
      );
    }

    const pricing = calculatePrice(
      rate,
      new Date(checkIn),
      new Date(checkOut),
      resolvedStayType as any
    );

    // 4. Find or create guest
    const guest = await findOrCreateGuest({
      full_name: guestName,
      email: guestEmail || null,
      phone: guestPhone,
      id_number: guestIdNumber || null,
    });

    // 5. Create booking
    const pmType = paymentMethodType || "pay_at_property";
    const booking = await createBooking({
      room_id: roomId,
      guest_id: guest.id,
      property_id: propertyId,
      check_in: checkIn,
      check_out: checkOut,
      stay_type: resolvedStayType,
      num_guests: numGuests || 1,
      special_requests: specialRequests || null,
      base_price: pricing.basePrice,
      tax_amount: pricing.tax,
      service_fee: pricing.serviceFee,
      discount_amount: pricing.discount,
      total_amount: pricing.total,
      deposit_amount: pricing.deposit,
      payment_method_type: pmType,
    });

    // 6. If walk-in and already paid, record payment immediately
    const finalPaidAmount = isPaid ? (paidAmount || pricing.total) : 0;
    if (isPaid && finalPaidAmount > 0) {
      const method = paidMethod || "cash";
      await createPayment({
        booking_id: booking.id,
        amount: finalPaidAmount,
        method: method === "transfer" ? "bank_transfer" : method,
      });

      // Update booking payment status
      const paymentStatus = finalPaidAmount >= pricing.total ? "paid" : "partial";
      const bookingStatus = "confirmed";

      await admin
        .from("bookings")
        .update({
          paid_amount: finalPaidAmount,
          payment_status: paymentStatus,
          status: bookingStatus,
        })
        .eq("id", booking.id);

      // Also record as on-site payment
      await admin
        .from("payments")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          on_site_method: paidMethod || "cash",
        })
        .eq("booking_id", booking.id)
        .is("paid_at", null);
    } else if (pmType === "pay_at_property") {
      // Confirm directly for pay at property
      await admin
        .from("bookings")
        .update({ status: "confirmed" })
        .eq("id", booking.id);
    }

    // 7. Notify
    try {
      await notifyNewBooking({
        id: booking.id,
        booking_code: booking.booking_code,
        guest: { full_name: guestName },
        room: {
          room_number: room.room_number,
          property: { name: room.property?.name || "" },
        },
        total_amount: pricing.total,
      });
    } catch {
      // ignore
    }

    return NextResponse.json(
      {
        booking: {
          id: booking.id,
          bookingCode: booking.booking_code,
          totalAmount: pricing.total,
        },
        pricing,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Manual booking error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
