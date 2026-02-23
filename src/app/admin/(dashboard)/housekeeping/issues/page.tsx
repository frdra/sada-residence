"use client";

import { useEffect, useState } from "react";

const SEVERITY_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: "Rendah", color: "bg-gray-100 text-gray-700" },
  medium: { label: "Sedang", color: "bg-yellow-100 text-yellow-700" },
  high: { label: "Tinggi", color: "bg-orange-100 text-orange-700" },
  critical: { label: "Kritis", color: "bg-red-100 text-red-700" },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  reported: { label: "Dilaporkan", color: "bg-blue-100 text-blue-700" },
  acknowledged: { label: "Diterima", color: "bg-yellow-100 text-yellow-700" },
  in_progress: { label: "Diperbaiki", color: "bg-orange-100 text-orange-700" },
  resolved: { label: "Selesai", color: "bg-green-100 text-green-700" },
  closed: { label: "Ditutup", color: "bg-gray-100 text-gray-600" },
};

const STATUS_FLOW = ["reported", "acknowledged", "in_progress", "resolved", "closed"];

export default function AdminHousekeepingIssuesPage() {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("");
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  useEffect(() => {
    loadIssues();
  }, [filterStatus, filterSeverity]);

  const loadIssues = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (filterSeverity) params.set("severity", filterSeverity);

    try {
      const res = await fetch(`/api/admin/housekeeping/issues?${params}`);
      const data = await res.json();
      setIssues(data.issues || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const updateStatus = async (issueId: string, newStatus: string) => {
    try {
      await fetch("/api/admin/housekeeping/issues", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueId,
          status: newStatus,
          resolutionNotes: newStatus === "resolved" ? resolutionNotes : undefined,
        }),
      });
      setSelectedIssue(null);
      setResolutionNotes("");
      await loadIssues();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Laporan Kerusakan</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm"
        >
          <option value="">Semua Status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select
          value={filterSeverity}
          onChange={(e) => setFilterSeverity(e.target.value)}
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm"
        >
          <option value="">Semua Severity</option>
          {Object.entries(SEVERITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : issues.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Tidak ada laporan</div>
      ) : (
        <div className="grid gap-4">
          {issues.map((issue: any) => {
            const currentIdx = STATUS_FLOW.indexOf(issue.status);
            const nextStatus = currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;

            return (
              <div key={issue.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-gray-900">{issue.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Kamar {issue.room?.room_number} • {issue.property?.name?.replace("Sada Residence ", "")} • Dilaporkan oleh {issue.reporter?.full_name || "–"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEVERITY_LABELS[issue.severity]?.color || ""}`}>
                      {SEVERITY_LABELS[issue.severity]?.label}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_LABELS[issue.status]?.color || ""}`}>
                      {STATUS_LABELS[issue.status]?.label}
                    </span>
                  </div>
                </div>

                {issue.description && (
                  <p className="text-sm text-gray-600 mt-2">{issue.description}</p>
                )}

                {/* Photos */}
                {issue.photos?.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {issue.photos.map((p: any) => (
                      <a key={p.id} href={p.photo_url} target="_blank" rel="noopener noreferrer">
                        <img src={p.photo_url} alt="" className="w-20 h-20 rounded-lg object-cover border hover:opacity-80" />
                      </a>
                    ))}
                  </div>
                )}

                {/* Resolution notes */}
                {issue.resolution_notes && (
                  <div className="mt-3 bg-green-50 rounded-lg p-3">
                    <p className="text-xs font-medium text-green-700">Catatan Resolusi:</p>
                    <p className="text-sm text-green-600">{issue.resolution_notes}</p>
                  </div>
                )}

                {/* Status progress */}
                <div className="flex items-center gap-1 mt-3">
                  {STATUS_FLOW.map((s, i) => (
                    <div key={s} className={`flex-1 h-1.5 rounded-full ${i <= currentIdx ? "bg-blue-500" : "bg-gray-200"}`} />
                  ))}
                </div>

                {/* Action buttons */}
                {nextStatus && nextStatus !== "resolved" && (
                  <button
                    onClick={() => updateStatus(issue.id, nextStatus)}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                  >
                    → {STATUS_LABELS[nextStatus]?.label}
                  </button>
                )}
                {nextStatus === "resolved" && (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                      placeholder="Catatan resolusi..."
                      rows={2}
                    />
                    <button
                      onClick={() => updateStatus(issue.id, "resolved")}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700"
                    >
                      Tandai Selesai
                    </button>
                  </div>
                )}

                <p className="text-xs text-gray-400 mt-3">
                  {new Date(issue.created_at).toLocaleString("id-ID")}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
