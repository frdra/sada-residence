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

const statusColors: Record<string, string> = {
  available: "bg-green-100 text-green-700",
  occupied: "bg-blue-100 text-blue-700",
  maintenance: "bg-yellow-100 text-yellow-700",
  blocked: "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
  available: "Tersedia",
  occupied: "Terisi",
  maintenance: "Maintenance",
  blocked: "Diblokir",
};

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ property: "", status: "" });

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

  // Group rooms by property
  const grouped = rooms.reduce((acc, room) => {
    const key = room.property?.name || "Unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(room);
    return acc;
  }, {} as Record<string, Room[]>);

  return (
    <div>
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
            <h3 className="font-semibold text-lg mb-4">{propertyName}</h3>
            <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-15 gap-2">
              {propertyRooms.map((room) => (
                <div
                  key={room.id}
                  className="relative group"
                >
                  <div
                    className={`p-2 rounded-lg text-center text-xs font-medium cursor-pointer transition-all hover:shadow-md ${
                      statusColors[room.status] || "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {room.room_number}
                  </div>
                  {/* Tooltip with status change */}
                  <div className="absolute z-10 hidden group-hover:block top-full left-1/2 -translate-x-1/2 mt-1">
                    <div className="bg-white rounded-lg shadow-xl border p-3 min-w-[160px]">
                      <p className="text-xs font-semibold mb-1">{room.room_number}</p>
                      <p className="text-xs text-gray-500 mb-2">
                        {room.room_type?.name} &middot; Lantai {room.floor}
                      </p>
                      <select
                        className="text-xs border rounded px-2 py-1 w-full"
                        value={room.status}
                        onChange={(e) => handleStatusChange(room.id, e.target.value)}
                      >
                        {Object.entries(statusLabels).map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
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
                  <div className={`w-3 h-3 rounded ${statusColors[val]?.split(" ")[0]}`} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
