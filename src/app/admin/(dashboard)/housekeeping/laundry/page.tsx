"use client";

import { useEffect, useState } from "react";

const STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: "Menunggu", color: "bg-gray-100 text-gray-700", icon: "⏳" },
  picked_up: { label: "Diambil", color: "bg-blue-100 text-blue-700", icon: "📦" },
  washing: { label: "Dicuci", color: "bg-indigo-100 text-indigo-700", icon: "🧼" },
  done: { label: "Selesai", color: "bg-green-100 text-green-700", icon: "✅" },
  delivered: { label: "Diantar", color: "bg-emerald-100 text-emerald-700", icon: "🚚" },
};

const STATUS_FLOW = ["pending", "picked_up", "washing", "done", "delivered"];

export default function AdminHousekeepingLaundryPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => { loadData(); }, [filterStatus]);

  const loadData = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    try {
      const res = await fetch(`/api/staff/laundry?${params}`);
      const data = await res.json();
      setRequests(data.requests || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Laundry Management</h1>

      <div className="flex flex-wrap gap-3">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm"
        >
          <option value="">Semua Status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Tidak ada permintaan laundry</div>
      ) : (
        <div className="grid gap-4">
          {requests.map((req: any) => {
            const statusInfo = STATUS_LABELS[req.status];
            const currentIdx = STATUS_FLOW.indexOf(req.status);
            const nextStatus = currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;

            return (
              <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-gray-900">
                      Kamar {req.room?.room_number}
                      <span className="font-normal text-gray-500 ml-2 text-sm">
                        {req.property?.name?.replace("Sada Residence ", "")}
                      </span>
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Staff: {req.staff?.full_name || "–"} •{" "}
                      {req.request_type === "express" ? (
                        <span className="text-orange-600 font-medium">Express</span>
                      ) : "Regular"}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo?.color || ""}`}>
                    {statusInfo?.icon} {statusInfo?.label}
                  </span>
                </div>

                {/* Items */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {(req.items || []).map((item: any, i: number) => (
                    <span key={i} className="bg-gray-100 px-3 py-1 rounded-lg text-sm text-gray-700">
                      {item.name} ×{item.quantity}
                    </span>
                  ))}
                  <span className="bg-blue-50 px-3 py-1 rounded-lg text-sm text-blue-700 font-medium">
                    Total: {req.total_items} item
                  </span>
                </div>

                {req.notes && <p className="text-sm text-gray-500 mt-2">Catatan: {req.notes}</p>}

                {/* Progress */}
                <div className="flex items-center gap-1 mt-3">
                  {STATUS_FLOW.map((s, i) => (
                    <div key={s} className={`flex-1 h-1.5 rounded-full ${i <= currentIdx ? "bg-blue-500" : "bg-gray-200"}`} />
                  ))}
                </div>

                {/* Next action */}
                {nextStatus && (
                  <button
                    onClick={() => updateStatus(req.id, nextStatus)}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                  >
                    {STATUS_LABELS[nextStatus]?.icon} → {STATUS_LABELS[nextStatus]?.label}
                  </button>
                )}

                <p className="text-xs text-gray-400 mt-2">
                  {new Date(req.created_at).toLocaleString("id-ID")}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
