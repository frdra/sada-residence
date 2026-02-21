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
    <div className="py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
            isPaid ? "bg-green-100" : "bg-yellow-100"
          }`}>
            <span className="text-3xl">{isPaid ? "✓" : "⏳"}</span>
          </div>
          <h1 className="section-title mb-2">
            {isPaid ? "Booking Dikonfirmasi!" : "Menunggu Pembayaran"}
          </h1>
          <p className="text-gray-600">
            Kode Booking: <strong className="text-navy-900">{booking.booking_code}</strong>
          </p>
        </div>

        <div className="card p-8 space-y-6">
          <div>
            <h3 className="font-semibold text-sm text-gray-500 uppercase mb-3">Detail Reservasi</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Properti</p>
                <p className="font-medium">{room?.property?.name}</p>
              </div>
              <div>
                <p className="text-gray-500">Tipe Kamar</p>
                <p className="font-medium">{room?.room_type?.name}</p>
              </div>
              <div>
                <p className="text-gray-500">Check-in</p>
                <p className="font-medium">{formatDate(booking.check_in)}</p>
              </div>
              <div>
                <p className="text-gray-500">Check-out</p>
                <p className="font-medium">{formatDate(booking.check_out)}</p>
              </div>
              <div>
                <p className="text-gray-500">Tamu</p>
                <p className="font-medium">{guest?.full_name}</p>
              </div>
              <div>
                <p className="text-gray-500">Status</p>
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                  booking.status === "confirmed" ? "bg-green-100 text-green-700" :
                  booking.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                  "bg-gray-100 text-gray-700"
                }`}>
                  {booking.status}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold text-sm text-gray-500 uppercase mb-3">Rincian Biaya</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Harga Kamar</span>
                <span>{formatCurrency(booking.base_price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Pajak (11%)</span>
                <span>{formatCurrency(booking.tax_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Biaya Layanan</span>
                <span>{formatCurrency(booking.service_fee)}</span>
              </div>
              {booking.discount_amount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Diskon</span>
                  <span>-{formatCurrency(booking.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 font-bold text-lg">
                <span>Total</span>
                <span className="text-brand-500">{formatCurrency(booking.total_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Sudah Dibayar</span>
                <span className="text-green-600">{formatCurrency(booking.paid_amount || 0)}</span>
              </div>
            </div>
          </div>

          <div className="border-t pt-6 text-center">
            <p className="text-sm text-gray-500 mb-4">
              Email konfirmasi telah dikirim ke <strong>{guest?.email}</strong>
            </p>
            <Link href="/" className="btn-outline text-sm inline-block">
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
