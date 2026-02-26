import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookToken, mapXenditPaymentMethod } from "@/lib/payments/xendit";
import {
  getPaymentByXenditId,
  updatePaymentStatus,
  getBookingById,
  updateBookingPayment,
  updateBookingStatus,
} from "@/lib/db/queries";
import { paymentSuccessEmail, sendEmail } from "@/lib/email/templates";
import { notifyPaymentReceived } from "@/lib/notifications/service";

export async function POST(request: NextRequest) {
  try {
    // Verify webhook token
    const webhookToken = request.headers.get("x-callback-token") || "";
    if (!verifyWebhookToken(webhookToken)) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await request.json();
    const { id: xenditInvoiceId, status, paid_amount, payment_channel, paid_at } = body;

    if (!xenditInvoiceId) {
      return NextResponse.json({ error: "Missing invoice ID" }, { status: 400 });
    }

    // Find payment record
    const payment = await getPaymentByXenditId(xenditInvoiceId);
    if (!payment) {
      console.warn(`Payment not found for Xendit invoice: ${xenditInvoiceId}`);
      return NextResponse.json({ received: true });
    }

    // Map Xendit status to our status
    let paymentStatus: string;
    switch (status) {
      case "PAID":
      case "SETTLED":
        paymentStatus = "paid";
        break;
      case "EXPIRED":
        paymentStatus = "expired";
        break;
      default:
        paymentStatus = "pending";
    }

    // Update payment record
    const updatedPayment = await updatePaymentStatus(
      payment.id,
      paymentStatus,
      paid_at || (paymentStatus === "paid" ? new Date().toISOString() : undefined)
    );

    // If paid, update the booking
    if (paymentStatus === "paid") {
      const booking = await getBookingById(payment.booking_id);
      if (booking) {
        const newPaidAmount = (booking.paid_amount || 0) + (paid_amount || payment.amount);
        const bookingPaymentStatus =
          newPaidAmount >= booking.total_amount ? "paid" : "partial";

        await updateBookingPayment(booking.id, newPaidAmount, bookingPaymentStatus);

        // Update booking status to confirmed if it was pending
        if (booking.status === "pending") {
          await updateBookingStatus(booking.id, "confirmed");
        }

        // Update payment method based on Xendit channel
        if (payment_channel) {
          const { createAdminClient } = await import("@/lib/supabase/server");
          const supabase = createAdminClient();
          await supabase
            .from("payments")
            .update({ payment_method: mapXenditPaymentMethod(payment_channel) })
            .eq("id", payment.id);
        }

        // Send payment success email
        try {
          const guest = (booking as any).guest;
          if (guest?.email) {
            const emailData = paymentSuccessEmail(
              booking,
              paid_amount || payment.amount
            );
            await sendEmail(guest.email, emailData.subject, emailData.html);
          }
        } catch (err) {
          console.error("Payment success email failed:", err);
        }

        // Notify admin — payment received
        try {
          await notifyPaymentReceived(
            { id: booking.id, booking_code: booking.booking_code, guest: (booking as any).guest },
            paid_amount || payment.amount,
            payment_channel || "online"
          );
        } catch (err) {
          console.error("Payment notification failed:", err);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Xendit webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
