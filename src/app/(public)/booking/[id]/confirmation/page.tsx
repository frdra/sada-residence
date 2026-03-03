import Link from "next/link";
import { getBookingById } from "@/lib/db/queries";
import { notFound } from "next/navigation";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const booking = await getBookingById(id);
  if (!booking) return notFound();

  const room = booking.room as any;
  const guest = booking.guest as any;
  const isPaid = booking.payment_status === "paid";

  return (
    <div className="pt-24 pb-16 bg-[#FAFAF8] min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-5 ${
            isPaid ? "bg-sage-100 border border-sage-200" : "bg-gold-100 border border-gold-200"
          }`}>
            {isPaid ? (
              <svg className="w-8 h-8 text-sage-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-gold-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <h1 className="font-display text-3xl font-light text-charcoal-800 mb-2">
            {isPaid ? "Booking Dikonfirmasi!" : "Menunggu Pembayaran"}
          </h1>
          <p className="font-body text-sm text-charcoal-600">
            Kode Booking: <strong className="text-charcoal-800 tracking-wider">{booking.booking_code}</strong>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-concrete-200 p-8 space-y-6 shadow-sm">
          <div>
            <h3 className="font-body text-[10px] font-semibold tracking-[0.2em] uppercase text-terracotta-500 mb-4">Detail Reservasi</h3>
            <div className="grid grid-cols-2 gap-4 text-sm font-body">
              <div>
                <p className="text-concrete-600 text-xs mb-0.5">Properti</p>
                <p className="font-medium text-charcoal-800">{room?.property?.name}</p>
              </div>
              <div>
                <p className="text-concrete-600 text-xs mb-0.5">Tipe Kamar</p>
                <p className="font-medium text-charcoal-800">{room?.room_type?.name}</p>
              </div>
              <div>
                <p className="text-concrete-600 text-xs mb-0.5">Check-in</p>
                <p className="font-medium text-charcoal-800">{formatDate(booking.check_in)}</p>
              </div>
              <div>
                <p className="text-concrete-600 text-xs mb-0.5">Check-out</p>
                <p className="font-medium text-charcoal-800">{formatDate(booking.check_out)}</p>
              </div>
              <div>
                <p className="text-concrete-600 text-xs mb-0.5">Tamu</p>
                <p className="font-medium text-charcoal-800">{guest?.full_name}</p>
              </div>
              <div>
                <p className="text-concrete-600 text-xs mb-0.5">Status</p>
                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${
                  booking.status === "confirmed" ? "bg-sage-100 text-sage-700" :
                  booking.status === "pending" ? "bg-gold-100 text-gold-700" :
                  "bg-concrete-100 text-charcoal-600"
                }`}>
                  {booking.status}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-concrete-200 pt-6">
            <h3 className="font-body text-[10px] font-semibold tracking-[0.2em] uppercase text-terracotta-500 mb-4">Rincian Biaya</h3>
            <div className="space-y-2.5 text-sm font-body">
              <div className="flex justify-between">
                <span className="text-charcoal-600">Harga Kamar</span>
                <span className="text-charcoal-800">{formatCurrency(booking.base_price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-600">Pajak (11%)</span>
                <span className="text-charcoal-800">{formatCurrency(booking.tax_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-charcoal-600">Biaya Layanan</span>
                <span className="text-charcoal-800">{formatCurrency(booking.service_fee)}</span>
              </div>
              {booking.discount_amount > 0 && (
                <div className="flex justify-between text-sage-600">
                  <span>Diskon</span>
                  <span>-{formatCurrency(booking.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-concrete-200 pt-3 mt-3">
                <span className="font-semibold text-charcoal-800">Total</span>
                <span className="font-display text-xl font-light text-terracotta-500">{formatCurrency(booking.total_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-concrete-600">Sudah Dibayar</span>
                <span className="text-sage-600 font-medium">{formatCurrency(booking.paid_amount || 0)}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-concrete-200 pt-6 text-center">
            <p className="font-body text-sm text-concrete-600 mb-5">
              Email konfirmasi telah dikirim ke <strong className="text-charcoal-800">{guest?.email}</strong>
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 border-2 border-terracotta-500 text-terracotta-500 font-body font-semibold px-6 py-3 rounded-full text-sm hover:bg-terracotta-500 hover:text-white transition-all duration-300"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
