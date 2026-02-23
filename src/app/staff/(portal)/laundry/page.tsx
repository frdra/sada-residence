"use client";

import { useEffect, useState } from "react";

const LAUNDRY_ITEMS = [
  { name: "Sprei", icon: "🛏️" },
  { name: "Sarung Bantal", icon: "🔲" },
  { name: "Selimut", icon: "🧣" },
  { name: "Handuk Mandi", icon: "🛁" },
  { name: "Handuk Tangan", icon: "🤲" },
  { name: "Keset", icon: "🚪" },
  { name: "Tirai", icon: "🪟" },
];

const STATUS_FLOW = ["pending", "picked_up", "washing", "done", "delivered"];
const STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: "Menunggu", color: "bg-gray-100 text-gray-700", icon: "⏳" },
  picked_up: { label: "Diambil", color: "bg-blue-100 text-blue-700", icon: "📦" },
  washing: { label: "Dicuci", color: "bg-indigo-100 text-indigo-700", icon: "🧼" },
  done: { label: "Selesai", color: "bg-green-100 text-green-700", icon: "✅" },
  delivered: { label: "Diantar", color: "bg-emerald-100 text-emerald-700", icon: "🚚" },
};

export default function StaffLaundryPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);

  // Form state
  const [selectedProperty, setSelectedProperty] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [items, setItems] = useState<Record<string, number>>({});
  const [requestType, setRequestType] = useState("regular");
  const [notes, setNotes] = useState("");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [laundryRes, profileRes] = await Promise.all([
        fetch("/api/staff/laundry"),
        fetch("/api/staff/profile"),
      ]);
      const laundryData = await laundryRes.json();
      const profileData = await profileRes.json();
      setRequests(laundryData.requests || []);
      setProperties(profileData.properties || []);
      setRooms(profileData.rooms || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const filteredRooms = rooms.filter((r: any) => r.property_id === selectedProperty);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const itemsList = Object.entries(items)
      .filter(([, qty]) => qty > 0)
      .map(([name, quantity]) => ({ name, quantity }));

    if (itemsList.length === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/staff/laundry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: selectedRoom,
          propertyId: selectedProperty,
          requestType,
          items: itemsList,
          notes: notes || undefined,
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setItems({});
        setNotes("");
        await loadData();
      }
    } catch (e) { console.error(e); } finally { setSubmitting(false); }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      await fetch(`/api/staff/laundry/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      await loadData();
    } catch (e) { console.error(e); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (showForm) {
    const totalItems = Object.values(items).reduce((sum, q) => sum + q, 0);

    return (
      <div className="p-4">
        <button onClick={() => setShowForm(false)} className="flex items-center gap-2 text-blue-600 text-sm font-medium mb-4">
          ← Kembali
        </button>

        <h2 className="font-bold text-lg text-gray-900 mb-4">Permintaan Laundry</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Property */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Building</label>
            <select
              value={selectedProperty}
              onChange={(e) => { setSelectedProperty(e.target.value); setSelectedRoom(""); }}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 text-base"
              required
            >
              <option value="">Pilih building</option>
              {properties.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Room */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kamar</label>
            <select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 text-base"
              required
              disabled={!selectedProperty}
            >
              <option value="">Pilih kamar</option>
              {filteredRooms.map((r: any) => (
                <option key={r.id} value={r.id}>{r.room_number} (Lt. {r.floor})</option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipe</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRequestType("regular")}
                className={`flex-1 py-3 rounded-xl border text-sm font-medium ${
                  requestType === "regular"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 text-gray-600"
                }`}
              >
                Regular
              </button>
              <button
                type="button"
                onClick={() => setRequestType("express")}
                className={`flex-1 py-3 rounded-xl border text-sm font-medium ${
                  requestType === "express"
                    ? "border-orange-500 bg-orange-50 text-orange-700"
                    : "border-gray-200 text-gray-600"
                }`}
              >
                Express
              </button>
            </div>
          </div>

          {/* Items */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item Laundry ({totalItems} item)
            </label>
            <div className="space-y-2">
              {LAUNDRY_ITEMS.map((item) => (
                <div key={item.name} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <span>{item.icon}</span>
                    <span className="text-sm text-gray-700">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setItems({ ...items, [item.name]: Math.max(0, (items[item.name] || 0) - 1) })
                      }
                      className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-medium text-sm">
                      {items[item.name] || 0}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setItems({ ...items, [item.name]: (items[item.name] || 0) + 1 })
                      }
                      className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (opsional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 text-base"
              rows={2}
              placeholder="Catatan tambahan..."
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !selectedRoom || totalItems === 0}
            className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl text-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Mengirim..." : "👕 Kirim Permintaan"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg text-gray-900">Laundry</h2>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700"
        >
          + Baru
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-4xl">👕</span>
          <p className="text-gray-500 mt-3">Belum ada permintaan laundry</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req: any) => {
            const statusInfo = STATUS_LABELS[req.status];
            const currentIdx = STATUS_FLOW.indexOf(req.status);
            const nextStatus = currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;

            return (
              <div key={req.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-sm text-gray-900">
                      Kamar {req.room?.room_number}
                    </p>
                    <p className="text-xs text-gray-500">{req.property?.name}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo?.color || ""}`}>
                    {statusInfo?.icon} {statusInfo?.label || req.status}
                  </span>
                </div>

                {/* Items */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {(req.items || []).map((item: any, i: number) => (
                    <span key={i} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-lg text-xs">
                      {item.name} ×{item.quantity}
                    </span>
                  ))}
                </div>

                {/* Progress dots */}
                <div className="flex items-center gap-1 mt-3">
                  {STATUS_FLOW.map((s, i) => (
                    <div
                      key={s}
                      className={`flex-1 h-1.5 rounded-full ${
                        i <= currentIdx ? "bg-blue-500" : "bg-gray-200"
                      }`}
                    />
                  ))}
                </div>

                {/* Next status button */}
                {nextStatus && (
                  <button
                    onClick={() => updateStatus(req.id, nextStatus)}
                    className="mt-3 w-full py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100"
                  >
                    {STATUS_LABELS[nextStatus]?.icon} {STATUS_LABELS[nextStatus]?.label}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
