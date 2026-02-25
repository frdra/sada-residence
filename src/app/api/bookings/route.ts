import { NextRequest, NextResponse } from "next/server";
import { bookingFormSchema } from "@/lib/validators/booking";
import { checkRoomAvailability } from "@/lib/db/availability";
import { getRateByTypeAndStay, getRoomById } from "@/lib/db/queries";
import { findOrCreateGuest, createBooking } from "@/lib/db/queries";
import { calculatePrice, suggestStayType } from "@/lib/db/pricing";
import { createXenditInvoice } from "@/lib/payments/xendit";
import { createPayment } from "@/lib/db/queries";
import {
  bookingConfirmationEmail,
  sendEmail,
} from "@/lib/email/templates";
import { differenceInDays } from "date-fns";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = bookingFormSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      roomId,
      checkIn,
      checkOut,
      numGuests,
      stayType,
      specialRequests,
      guest,
      paymentMethodType,
    } = parsed.data;

    const pmType = paymentMethodType || "online";

    // 1. Verify room exists
    const room = await getRoomById(roomId);
    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // 2. Check availability with row-level locking
    const isAvailable = await checkRoomAvailability(roomId, checkIn, checkOut);
    if (!isAvailable) {
      return NextResponse.json(
        { error: "Room is no longer available for the selected dates" },
        { status: 409 }
      );
    }

    // 3. Calculate pricing
    const nights = differenceInDays(new Date(checkOut), new Date(checkIn));
    const resolvedStayType = stayType || suggestStayType(nights);
    const roomTypeId = (room as any).room_type_id || (room as any).room_type?.id;

    const rate = await getRateByTypeAndStay(roomTypeId, resolvedStayType);
    if (!rate) {
      return NextResponse.json(
        { error: "No rate found for this room type and stay type" },
        { status: 400 }
      );
    }

    const pricing = calculatePrice(
      rate,
      new Date(checkIn),
      new Date(checkOut),
      resolvedStayType as any
    );

    // 4. Create or find guest
    const guestRecord = await findOrCreateGuest({
      full_name: guest.fullName,
      email: guest.email,
      phone: guest.phone,
      id_number: guest.idNumber,
    });

    // 5. Create booking with payment_method_type
    const booking = await createBooking({
      room_id: roomId,
      guest_id: guestRecord.id,
      property_id: (room as any).property_id || (room as any).property?.id,
      check_in: checkIn,
      check_out: checkOut,
      stay_type: resolvedStayType,
      num_guests: numGuests,
      special_requests: specialRequests,
      base_price: pricing.basePrice,
      tax_amount: pricing.tax,
      service_fee: pricing.serviceFee,
      discount_amount: pricing.discount,
      total_amount: pricing.total,
      deposit_amount: pricing.deposit,
      payment_method_type: pmType,
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    let invoiceUrl = "";

    // 6. Handle payment based on payment method type
    if (pmType === "online") {
      // Full online payment — charge full amount via Xendit
      try {
        const invoice = await createXenditInvoice({
          externalId: `booking-${booking.id}`,
          amount: pricing.total,
          payerEmail: guest.email,
          description: `Pembayaran booking ${booking.booking_code} — Sada Residence`,
          successRedirectUrl: `${appUrl}/booking/${booking.id}/confirmation`,
          failureRedirectUrl: `${appUrl}/booking/${booking.id}`,
          customerName: guest.fullName,
          customerPhone: guest.phone,
        });

        invoiceUrl = invoice.invoice_url;

        await createPayment({
          booking_id: booking.id,
          amount: pricing.total,
          method: "bank_transfer",
          external_id: `booking-${booking.id}`,
          xendit_invoice_id: invoice.id,
          xendit_invoice_url: invoice.invoice_url,
        });
      } catch (err) {
        console.error("Xendit invoice creation failed:", err);
      }
    } else if (pmType === "dp_online") {
      // DP online + remainder at property — charge deposit via Xendit
      try {
        const invoice = await createXenditInvoice({
          externalId: `booking-${booking.id}-dp`,
          amount: pricing.deposit,
          payerEmail: guest.email,
          description: `DP booking ${booking.booking_code} — Sada Residence (sisa bayar di lokasi)`,
          successRedirectUrl: `${appUrl}/booking/${booking.id}/confirmation`,
          failureRedirectUrl: `${appUrl}/booking/${booking.id}`,
          customerName: guest.fullName,
          customerPhone: guest.phone,
        });

        invoiceUrl = invoice.invoice_url;

        await createPayment({
          booking_id: booking.id,
          amount: pricing.deposit,
          method: "bank_transfer",
          external_id: `booking-${booking.id}-dp`,
          xendit_invoice_id: invoice.id,
          xendit_invoice_url: invoice.invoice_url,
        });
      } catch (err) {
        console.error("Xendit invoice creation failed:", err);
      }
    } else if (pmType === "pay_at_property") {
      // Full payment at property — no Xendit, booking is confirmed directly
      // Create a pending payment record for tracking
      try {
        await createPayment({
          booking_id: booking.id,
          amount: pricing.total,
          method: "cash", // will be updated when admin records actual payment
        });
      } catch (err) {
        console.error("Payment record creation failed:", err);
      }
    }

    // 7. Send confirmation email
    try {
      const emailData = bookingConfirmationEmail(booking);
      await sendEmail(guest.email, emailData.subject, emailData.html);
    } catch (err) {
      console.error("Email send failed:", err);
    }

    return NextResponse.json(
      {
        booking: {
          id: booking.id,
          bookingCode: booking.booking_code,
          totalAmount: pricing.total,
          depositAmount: pricing.deposit,
          paymentMethodType: pmType,
        },
        paymentUrl: invoiceUrl || null,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Booking creation error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
