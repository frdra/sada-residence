"use client";

import { useEffect, useState } from "react";

interface Room {
  id: string;
  room_number: string;
  floor: number;
  status: string;
  room_type: { id: string; name: string; slug: string };
  property: { id: string; name: string; slug: string };
}

interface RoomGuest {
  id: string;
  booking_code: string;
  check_in: string;
  check_out: string;
  stay_type: string;
  total_amount: number;
  paid_amount: number;
  payment_status: string;
  checked_in_at: string;
  guest: {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    id_type: string | null;
    id_number: string | null;
  };
}

const statusColors: Record<string, string> = {
  available: "bg-green-100 text-green-700 border-green-200",
  occupied: "bg-blue-100 text-blue-700 border-blue-200",
  maintenance: "bg-yellow-100 text-yellow-700 border-yellow-200",
  blocked: "bg-red-100 text-red-700 border-red-200",
};

const statusLabels: Record<string, string> = {
  available: "Tersedia",
  occupied: "Terisi",
  maintenance: "Maintenance",
  blocked: "Diblokir",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

const stayTypeLabels: Record<string, string> = {
  daily: "Harian",
  monthly: "Bulanan",
  yearly: "Tahunan",
};

const paymentLabels: Record<string, string> = {
  unpaid: "Belum Bayar",
  partial: "Sebagian",
  paid: "Lunas",
};

const paymentColors: Record<string, string> = {
  unpaid: "bg-red-100 text-red-700",
  partial: "bg-yellow-100 text-yellow-700",
  paid: "bg-green-100 text-green-700",
};

// ── Guest Info Modal ──
function GuestInfoModal({
  room,
  onClose,
}: {
  room: Room;
  onClose: () => void;
}) {
  const [booking, setBooking] = useState<RoomGuest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/rooms?roomId=${room.id}`);
        const data = await res.json();
        setBooking(data.booking || null);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, [room.id]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full">
        <div className="p-5 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">
                Kamar {room.room_number}
              </h2>
              <p className="text-sm text-gray-500">
                {room.property?.name} &middot; Lantai {room.floor}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              &times;
            </button>
          </div>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="py-8 text-center text-gray-400">Memuat...</div>
          ) : !booking ? (
            <div className="py-8 text-center text-gray-400">
              Tidak ada tamu yang sedang menginap di kamar ini.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Guest Info */}
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-xs text-blue-500 font-medium mb-1">
                  Tamu Saat Ini
                </p>
                <p className="text-lg font-bold text-gray-900">
                  {booking.guest?.full_name}
                </p>
                <div className="flex gap-4 mt-2 text-sm text-gray-600">
                  <span>{booking.guest?.phone}</span>
                  {booking.guest?.email && (
                    <span className="text-gray-400">{booking.guest.email}</span>
                  )}
                </div>
              </div>

              {/* Booking Details */}
              <div className="space-y-2.5">
                {[
                  { label: "Kode Booking", value: booking.booking_code, mono: true },
                  { label: "Tipe Menginap", value: stayTypeLabels[booking.stay_type] || booking.stay_type },
                  {
                    label: "Tanggal",
                    value: `${new Date(booking.check_in).toLocaleDateString("id-ID")} — ${new Date(booking.check_out).toLocaleDateString("id-ID")}`,
                  },
                  {
                    label: "Check-in",
                    value: booking.checked_in_at
                      ? new Date(booking.checked_in_at).toLocaleString("id-ID")
                      : "—",
                  },
                  { label: "Total", value: formatCurrency(booking.total_amount), bold: true },
                  {
                    label: "Dibayar",
                    value: formatCurrency(booking.paid_amount || 0),
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex justify-between items-center py-1.5"
                  >
                    <span className="text-sm text-gray-500">{row.label}</span>
                    <span
                      className={`text-sm ${row.bold ? "font-bold" : "font-medium"} ${row.mono ? "font-mono" : ""}`}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between items-center py-1.5">
                  <span className="text-sm text-gray-500">Status Bayar</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${paymentColors[booking.payment_status] || "bg-gray-100"}`}
                  >
                    {paymentLabels[booking.payment_status] || booking.payment_status}
                  </span>
                </div>
                {booking.guest?.id_type && (
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-sm text-gray-500">ID ({booking.guest.id_type})</span>
                    <span className="text-sm font-mono">{booking.guest.id_number || "—"}</span>
                  </div>
                )}
              </div>

              <a
                href={`/admin/bookings`}
                className="block w-full text-center px-4 py-2.5 bg-navy-900 text-white rounded-xl text-sm font-medium hover:bg-navy-800 transition-colors"
              >
                Lihat di Halaman Booking
              </a>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full mt-3 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──
export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ property: "", status: "" });
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const fetchRooms = async () => {
    const params = new URLSearchParams();
    if (filter.property) params.set("propertyId", filter.property);
    if (filter.status) params.set("status", filter.status);

    const res = await fetch(`/api/admin/rooms?${params}`);
    const data = await res.json();
    setRooms(data.rooms || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms();
  }, [filter]);

  const handleStatusChange = async (roomId: string, newStatus: string) => {
    await fetch("/api/admin/rooms", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, status: newStatus }),
    });
    fetchRooms();
  };

  const handleRoomClick = (room: Room) => {
    if (room.status === "occupied") {
      setSelectedRoom(room);
    }
  };

  // Group rooms by property
  const grouped = rooms.reduce((acc, room) => {
    const key = room.property?.name || "Unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(room);
    return acc;
  }, {} as Record<string, Room[]>);

  // Stats
  const total = rooms.length;
  const occupied = rooms.filter((r) => r.status === "occupied").length;
  const available = rooms.filter((r) => r.status === "available").length;
  const maintenance = rooms.filter((r) => r.status === "maintenance").length;

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total", value: total, color: "bg-gray-50" },
          { label: "Tersedia", value: available, color: "bg-green-50 text-green-700" },
          { label: "Terisi", value: occupied, color: "bg-blue-50 text-blue-700" },
          { label: "Maintenance", value: maintenance, color: "bg-yellow-50 text-yellow-700" },
        ].map((s) => (
          <div key={s.label} className={`${s.color} rounded-xl p-3 text-center`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          className="input-field !w-auto"
          value={filter.status}
          onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="">Semua Status</option>
          <option value="available">Tersedia</option>
          <option value="occupied">Terisi</option>
          <option value="maintenance">Maintenance</option>
          <option value="blocked">Diblokir</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-900" />
        </div>
      ) : (
        Object.entries(grouped).map(([propertyName, propertyRooms]) => (
          <div key={propertyName} className="mb-8">
            <h3 className="font-semibold text-lg mb-4">
              {propertyName}
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({propertyRooms.filter((r) => r.status === "occupied").length}/{propertyRooms.length} terisi)
              </span>
            </h3>
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-15 gap-2">
              {propertyRooms.map((room) => (
                <div key={room.id} className="relative group">
                  <div
                    onClick={() => handleRoomClick(room)}
                    className={`p-2 rounded-lg text-center text-xs font-medium transition-all border ${
                      statusColors[room.status] || "bg-gray-100 text-gray-700 border-gray-200"
                    } ${
                      room.status === "occupied"
                        ? "cursor-pointer hover:shadow-md hover:scale-105"
                        : "cursor-default"
                    }`}
                  >
                    {room.room_number}
                  </div>
                  {/* Tooltip with status change */}
                  <div className="absolute z-10 hidden group-hover:block top-full left-1/2 -translate-x-1/2 mt-1">
                    <div className="bg-white rounded-lg shadow-xl border p-3 min-w-[160px]">
                      <p className="text-xs font-semibold mb-1">
                        {room.room_number}
                      </p>
                      <p className="text-xs text-gray-500 mb-2">
                        {room.room_type?.name} &middot; Lantai {room.floor}
                      </p>
                      {room.status === "occupied" && (
                        <p className="text-xs text-blue-500 mb-2">
                          Klik untuk lihat tamu
                        </p>
                      )}
                      <select
                        className="text-xs border rounded px-2 py-1 w-full"
                        value={room.status}
                        onChange={(e) =>
                          handleStatusChange(room.id, e.target.value)
                        }
                        onClick={(e) => e.stopPropagation()}
                      >
                        {Object.entries(statusLabels).map(([val, label]) => (
                          <option key={val} value={val}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex gap-4 mt-3 text-xs text-gray-500">
              {Object.entries(statusLabels).map(([val, label]) => (
                <div key={val} className="flex items-center gap-1">
                  <div
                    className={`w-3 h-3 rounded ${statusColors[val]?.split(" ")[0]}`}
                  />
                  <span>{label}</span>
                </div>
              ))}
              <span className="ml-2 text-gray-400">
                (klik kamar terisi untuk detail tamu)
              </span>
            </div>
          </div>
        ))
      )}

      {/* Guest Info Modal */}
      {selectedRoom && (
        <GuestInfoModal
          room={selectedRoom}
          onClose={() => setSelectedRoom(null)}
        />
      )}
    </div>
  );
}
