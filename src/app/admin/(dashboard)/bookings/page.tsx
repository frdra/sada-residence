"use client";

import { useEffect, useState, useRef } from "react";

interface Guest {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  id_type: string | null;
  id_number: string | null;
  id_photo_url: string | null;
}

interface Booking {
  id: string;
  booking_code: string;
  status: string;
  payment_status: string;
  payment_method_type: string;
  check_in: string;
  check_out: string;
  stay_type: string;
  total_amount: number;
  paid_amount: number;
  deposit_amount: number;
  created_at: string;
  guest: Guest;
  guest_id: string;
  room: {
    room_number: string;
    room_type: { name: string };
    property: { name: string };
  };
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  checked_in: "bg-green-100 text-green-700",
  checked_out: "bg-gray-100 text-gray-700",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-red-100 text-red-700",
};

const paymentColors: Record<string, string> = {
  unpaid: "bg-red-100 text-red-700",
  partial: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
  refunded: "bg-purple-100 text-purple-700",
};

const statusLabels: Record<string, string> = {
  pending: "Menunggu",
  confirmed: "Dikonfirmasi",
  checked_in: "Check In",
  checked_out: "Check Out",
  cancelled: "Dibatalkan",
  no_show: "No Show",
};

const paymentLabels: Record<string, string> = {
  unpaid: "Belum Bayar",
  partial: "Sebagian",
  paid: "Lunas",
  refunded: "Refund",
};

const paymentMethodTypeLabels: Record<string, { label: string; color: string; icon: string }> = {
  online: { label: "Online", color: "bg-blue-50 text-blue-600", icon: "💳" },
  dp_online: { label: "DP+Lokasi", color: "bg-orange-50 text-orange-600", icon: "🏦" },
  pay_at_property: { label: "Di Lokasi", color: "bg-purple-50 text-purple-600", icon: "🏠" },
};

// ── Record Payment Modal ──
function RecordPaymentModal({
  booking,
  onClose,
  onSuccess,
}: {
  booking: Booking;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const remaining = booking.total_amount - (booking.paid_amount || 0);
  const [amount, setAmount] = useState(remaining);
  const [onSiteMethod, setOnSiteMethod] = useState<"cash" | "qris" | "transfer">("cash");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError("Jumlah harus lebih dari 0");
      return;
    }
    if (amount > remaining) {
      setError(`Jumlah melebihi sisa pembayaran (${formatCurrency(remaining)})`);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          amount,
          onSiteMethod,
          notes: notes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mencatat pembayaran");

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Catat Pembayaran di Lokasi</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Booking Summary */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Kode Booking</span>
              <span className="text-sm font-mono font-bold">{booking.booking_code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Tamu</span>
              <span className="text-sm font-medium">{booking.guest?.full_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Total</span>
              <span className="text-sm font-medium">{formatCurrency(booking.total_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Sudah Dibayar</span>
              <span className="text-sm font-medium text-green-600">{formatCurrency(booking.paid_amount || 0)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="text-sm font-medium text-gray-700">Sisa</span>
              <span className="text-sm font-bold text-red-600">{formatCurrency(remaining)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Metode Pembayaran</label>
            <div className="grid grid-cols-3 gap-3">
              {([
                { value: "cash" as const, label: "Cash", icon: "💵" },
                { value: "qris" as const, label: "QRIS", icon: "📱" },
                { value: "transfer" as const, label: "Transfer", icon: "🏧" },
              ]).map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setOnSiteMethod(m.value)}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    onSiteMethod === m.value
                      ? "border-blue-400 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="text-xl mb-1">{m.icon}</div>
                  <div className="text-xs font-medium">{m.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Pembayaran</label>
            <input
              type="number"
              className="input-field"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min={1}
              max={remaining}
            />
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => setAmount(remaining)}
                className="text-xs px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Bayar Penuh ({formatCurrency(remaining)})
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (opsional)</label>
            <textarea
              className="input-field"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Mis. nomor referensi transfer..."
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 btn-primary !py-2.5 text-sm disabled:opacity-50"
            >
              {submitting ? "Memproses..." : "Catat Pembayaran"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Check-In Modal ──
function CheckInModal({
  booking,
  onClose,
  onSuccess,
}: {
  booking: Booking;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [idType, setIdType] = useState(booking.guest?.id_type || "KTP");
  const [idNumber, setIdNumber] = useState(booking.guest?.id_number || "");
  const [idPhoto, setIdPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Ukuran foto maksimal 5MB");
        return;
      }
      setIdPhoto(file);
      setPreview(URL.createObjectURL(file));
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idNumber.trim()) {
      setError("Nomor ID wajib diisi");
      return;
    }
    if (!idPhoto && !booking.guest?.id_photo_url) {
      setError("Foto ID wajib diupload");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("bookingId", booking.id);
      formData.append("guestId", booking.guest_id || booking.guest?.id);
      formData.append("idType", idType);
      formData.append("idNumber", idNumber);
      if (idPhoto) formData.append("idPhoto", idPhoto);

      const res = await fetch("/api/admin/checkin", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal check-in");

      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Check-In Tamu</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Kode Booking</span>
              <span className="text-sm font-mono font-bold">{booking.booking_code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Nama Tamu</span>
              <span className="text-sm font-medium">{booking.guest?.full_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Telepon</span>
              <span className="text-sm">{booking.guest?.phone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Kamar</span>
              <span className="text-sm font-medium">{booking.room?.room_number} — {booking.room?.property?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Tanggal</span>
              <span className="text-sm">
                {new Date(booking.check_in).toLocaleDateString("id-ID")} — {new Date(booking.check_out).toLocaleDateString("id-ID")}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Identitas</label>
            <select className="input-field" value={idType} onChange={(e) => setIdType(e.target.value)}>
              <option value="KTP">KTP</option>
              <option value="SIM">SIM</option>
              <option value="Paspor">Paspor</option>
              <option value="KITAS">KITAS</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nomor {idType} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="input-field"
              placeholder={`Masukkan nomor ${idType}`}
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Foto {idType} <span className="text-red-500">*</span>
            </label>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
            {preview || booking.guest?.id_photo_url ? (
              <div className="relative">
                <img src={preview || booking.guest?.id_photo_url || ""} alt="ID Preview" className="w-full h-48 object-cover rounded-xl border" />
                <button type="button" onClick={() => fileRef.current?.click()} className="absolute bottom-2 right-2 bg-white/90 text-sm px-3 py-1 rounded-lg shadow hover:bg-white transition-colors">
                  Ganti Foto
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full h-48 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-brand-400 hover:bg-brand-50/50 transition-colors cursor-pointer"
              >
                <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm text-gray-500">Klik untuk foto atau upload {idType}</span>
                <span className="text-xs text-gray-400">JPG, PNG (maks. 5MB)</span>
              </button>
            )}
          </div>

          {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
              Batal
            </button>
            <button type="submit" disabled={submitting} className="flex-1 btn-primary !py-2.5 text-sm disabled:opacity-50">
              {submitting ? "Memproses..." : "Check-In Tamu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Guest Detail Modal ──
function GuestDetailModal({ guestId, onClose }: { guestId: string; onClose: () => void }) {
  const [guest, setGuest] = useState<Guest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/checkin?guestId=${guestId}`);
        const data = await res.json();
        setGuest(data.guest);
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, [guestId]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Detail Tamu</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
          </div>
        </div>
        <div className="p-6">
          {loading ? (
            <p className="text-center text-gray-400 py-8">Memuat...</p>
          ) : !guest ? (
            <p className="text-center text-gray-400 py-8">Data tamu tidak ditemukan.</p>
          ) : (
            <div className="space-y-5">
              <div className="space-y-3">
                {[
                  { label: "Nama Lengkap", value: guest.full_name, bold: true },
                  { label: "Email", value: guest.email },
                  { label: "Telepon", value: guest.phone, bold: true },
                  { label: "Tipe ID", value: guest.id_type || "—" },
                  { label: "Nomor ID", value: guest.id_number || "—", mono: true },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-gray-500">{row.label}</span>
                    <span className={`text-sm ${row.bold ? "font-semibold" : ""} ${row.mono ? "font-mono" : ""}`}>{row.value}</span>
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Foto Identitas</label>
                {guest.id_photo_url ? (
                  <a href={guest.id_photo_url} target="_blank" rel="noopener noreferrer">
                    <img src={guest.id_photo_url} alt={`${guest.id_type} ${guest.full_name}`} className="w-full h-56 object-cover rounded-xl border hover:opacity-90 transition-opacity cursor-pointer" />
                    <p className="text-xs text-center text-brand-500 mt-2">Klik untuk lihat ukuran penuh</p>
                  </a>
                ) : (
                  <div className="w-full h-40 bg-gray-100 rounded-xl flex items-center justify-center">
                    <p className="text-sm text-gray-400">Belum ada foto ID (upload saat check-in)</p>
                  </div>
                )}
              </div>
              <button onClick={onClose} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                Tutup
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Bookings Page ──
export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");

  // Modals
  const [checkInBooking, setCheckInBooking] = useState<Booking | null>(null);
  const [detailGuestId, setDetailGuestId] = useState<string | null>(null);
  const [recordPaymentBooking, setRecordPaymentBooking] = useState<Booking | null>(null);

  const fetchBookings = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: page.toString(), limit: "20" });
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (paymentFilter) params.set("paymentStatus", paymentFilter);

    const res = await fetch(`/api/admin/bookings?${params}`);
    const data = await res.json();
    setBookings(data.data || []);
    setCount(data.count || 0);
    setLoading(false);
  };

  useEffect(() => { fetchBookings(); }, [page, statusFilter, paymentFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchBookings();
  };

  const handleStatusUpdate = async (bookingId: string, newStatus: string) => {
    await fetch("/api/admin/bookings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId, status: newStatus }),
    });
    fetchBookings();
  };

  const totalPages = Math.ceil(count / 20);

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input type="text" className="input-field !w-64" placeholder="Cari kode booking atau nama..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <button type="submit" className="btn-primary !py-2 text-sm">Cari</button>
        </form>
        <select className="input-field !w-auto" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">Semua Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="checked_in">Checked In</option>
          <option value="checked_out">Checked Out</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select className="input-field !w-auto" value={paymentFilter} onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}>
          <option value="">Semua Pembayaran</option>
          <option value="unpaid">Belum Bayar</option>
          <option value="partial">Sebagian</option>
          <option value="paid">Lunas</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Kode</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Tamu</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Kamar</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Tanggal</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Total</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Metode</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Bayar</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Memuat...</td></tr>
              ) : bookings.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Tidak ada booking ditemukan.</td></tr>
              ) : (
                bookings.map((b) => {
                  const pmInfo = paymentMethodTypeLabels[b.payment_method_type] || paymentMethodTypeLabels.online;
                  const remaining = b.total_amount - (b.paid_amount || 0);
                  const needsPayment = remaining > 0 && b.status !== "cancelled";

                  return (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{b.booking_code}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setDetailGuestId(b.guest_id || (b.guest as any)?.id)} className="text-left hover:text-brand-500 transition-colors">
                          <p className="font-medium">{b.guest?.full_name}</p>
                          <p className="text-xs text-gray-400">{b.guest?.phone}</p>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <p>{b.room?.room_number}</p>
                        <p className="text-xs text-gray-400">{b.room?.property?.name}</p>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {new Date(b.check_in).toLocaleDateString("id-ID")} — {new Date(b.check_out).toLocaleDateString("id-ID")}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{formatCurrency(b.total_amount)}</p>
                        {(b.paid_amount || 0) > 0 && (b.paid_amount || 0) < b.total_amount && (
                          <p className="text-xs text-green-600">Dibayar: {formatCurrency(b.paid_amount)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${pmInfo.color}`}>
                          {pmInfo.icon} {pmInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[b.status] || "bg-gray-100"}`}>
                          {statusLabels[b.status] || b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${paymentColors[b.payment_status] || "bg-gray-100"}`}>
                          {paymentLabels[b.payment_status] || b.payment_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {(b.status === "confirmed" || b.status === "pending") && (
                            <button onClick={() => setCheckInBooking(b)} className="px-3 py-1 text-xs font-medium bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                              Check In
                            </button>
                          )}
                          {needsPayment && (
                            <button onClick={() => setRecordPaymentBooking(b)} className="px-3 py-1 text-xs font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                              Catat Bayar
                            </button>
                          )}
                          <select className="text-xs border rounded px-2 py-1" value={b.status} onChange={(e) => handleStatusUpdate(b.id, e.target.value)}>
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="checked_in">Checked In</option>
                            <option value="checked_out">Checked Out</option>
                            <option value="cancelled">Cancelled</option>
                            <option value="no_show">No Show</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <p className="text-sm text-gray-500">Total: {count} booking</p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-50">Prev</button>
              <span className="px-3 py-1 text-sm">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 text-sm border rounded disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </div>

      {checkInBooking && (
        <CheckInModal booking={checkInBooking} onClose={() => setCheckInBooking(null)} onSuccess={() => { setCheckInBooking(null); fetchBookings(); }} />
      )}
      {detailGuestId && (
        <GuestDetailModal guestId={detailGuestId} onClose={() => setDetailGuestId(null)} />
      )}
      {recordPaymentBooking && (
        <RecordPaymentModal booking={recordPaymentBooking} onClose={() => setRecordPaymentBooking(null)} onSuccess={() => { setRecordPaymentBooking(null); fetchBookings(); }} />
      )}
    </div>
  );
}
