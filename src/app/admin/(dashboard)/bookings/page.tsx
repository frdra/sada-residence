"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Booking {
  id: string;
  booking_code: string;
  status: string;
  payment_status: string;
  check_in: string;
  check_out: string;
  stay_type: string;
  total_amount: number;
  paid_amount: number;
  created_at: string;
  guest: { full_name: string; email: string; phone: string };
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

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");

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

  useEffect(() => {
    fetchBookings();
  }, [page, statusFilter, paymentFilter]);

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
          <input
            type="text"
            className="input-field !w-64"
            placeholder="Cari kode booking atau nama..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn-primary !py-2 text-sm">
            Cari
          </button>
        </form>
        <select
          className="input-field !w-auto"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">Semua Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="checked_in">Checked In</option>
          <option value="checked_out">Checked Out</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          className="input-field !w-auto"
          value={paymentFilter}
          onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
        >
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
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Bayar</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    Memuat...
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                    Tidak ada booking ditemukan.
                  </td>
                </tr>
              ) : (
                bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">{b.booking_code}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{b.guest?.full_name}</p>
                      <p className="text-xs text-gray-400">{b.guest?.phone}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p>{b.room?.room_number}</p>
                      <p className="text-xs text-gray-400">{b.room?.property?.name}</p>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {new Date(b.check_in).toLocaleDateString("id-ID")} — {new Date(b.check_out).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(b.total_amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[b.status] || "bg-gray-100"}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${paymentColors[b.payment_status] || "bg-gray-100"}`}>
                        {b.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="text-xs border rounded px-2 py-1"
                        value={b.status}
                        onChange={(e) => handleStatusUpdate(b.id, e.target.value)}
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="checked_in">Checked In</option>
                        <option value="checked_out">Checked Out</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="no_show">No Show</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <p className="text-sm text-gray-500">
              Total: {count} booking
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50"
              >
                Prev
              </button>
              <span className="px-3 py-1 text-sm">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 text-sm border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
