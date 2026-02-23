"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminHousekeepingPage() {
  const [data, setData] = useState<any>(null);
  const [period, setPeriod] = useState("7d");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/housekeeping/overview?period=${period}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [period]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const { today, period: periodData, staffPerformance, issueStats, pendingLaundry, propertyStats } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Housekeeping</h1>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {["7d", "30d", "90d"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                period === p ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {p === "7d" ? "7 Hari" : p === "30d" ? "30 Hari" : "3 Bulan"}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Nav */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href="/admin/housekeeping/tasks?status=needs_review" className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 hover:bg-yellow-100 transition-colors">
          <div className="text-2xl font-bold text-yellow-600">{today.needsReview}</div>
          <div className="text-xs text-yellow-700 mt-1">Perlu Review</div>
        </Link>
        <Link href="/admin/housekeeping/issues" className="bg-red-50 border border-red-200 rounded-xl p-4 hover:bg-red-100 transition-colors">
          <div className="text-2xl font-bold text-red-600">{issueStats.total}</div>
          <div className="text-xs text-red-700 mt-1">Kerusakan Terbuka</div>
        </Link>
        <Link href="/admin/housekeeping/laundry" className="bg-blue-50 border border-blue-200 rounded-xl p-4 hover:bg-blue-100 transition-colors">
          <div className="text-2xl font-bold text-blue-600">{pendingLaundry}</div>
          <div className="text-xs text-blue-700 mt-1">Laundry Pending</div>
        </Link>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="text-2xl font-bold text-green-600">{periodData.avgScore}</div>
          <div className="text-xs text-green-700 mt-1">Skor Rata-rata</div>
        </div>
      </div>

      {/* Today Overview */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Tugas Hari Ini</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {[
            { label: "Total", value: today.total, color: "text-gray-900" },
            { label: "Menunggu", value: today.pending, color: "text-gray-500" },
            { label: "Dikerjakan", value: today.inProgress, color: "text-blue-600" },
            { label: "Review", value: today.needsReview, color: "text-yellow-600" },
            { label: "Disetujui", value: today.approved, color: "text-green-600" },
            { label: "Ditolak", value: today.rejected, color: "text-red-600" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        {today.total > 0 && (
          <div className="mt-4">
            <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
              {today.approved > 0 && (
                <div className="bg-green-500" style={{ width: `${(today.approved / today.total) * 100}%` }} />
              )}
              {today.needsReview > 0 && (
                <div className="bg-yellow-400" style={{ width: `${(today.needsReview / today.total) * 100}%` }} />
              )}
              {today.inProgress > 0 && (
                <div className="bg-blue-400" style={{ width: `${(today.inProgress / today.total) * 100}%` }} />
              )}
              {today.rejected > 0 && (
                <div className="bg-red-400" style={{ width: `${(today.rejected / today.total) * 100}%` }} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Per-Property */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Per Building</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {propertyStats.map((p: any) => (
            <div key={p.propertyId} className="bg-gray-50 rounded-xl p-4">
              <p className="font-medium text-gray-900 text-sm">{p.propertyName.replace("Sada Residence ", "")}</p>
              <div className="flex items-end gap-2 mt-2">
                <span className="text-2xl font-bold text-gray-900">{p.completed}</span>
                <span className="text-sm text-gray-500 mb-0.5">/ {p.todayTasks} tugas</span>
              </div>
              {p.todayTasks > 0 && (
                <div className="mt-2 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 rounded-full h-2"
                    style={{ width: `${(p.completed / p.todayTasks) * 100}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Staff Performance */}
      {staffPerformance.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Performa Karyawan ({periodData.days} Hari)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">Nama</th>
                  <th className="text-center py-3 px-2 text-gray-500 font-medium">Tugas</th>
                  <th className="text-center py-3 px-2 text-gray-500 font-medium">Disetujui</th>
                  <th className="text-center py-3 px-2 text-gray-500 font-medium">Ditolak</th>
                  <th className="text-center py-3 px-2 text-gray-500 font-medium">Skor</th>
                </tr>
              </thead>
              <tbody>
                {staffPerformance
                  .sort((a: any, b: any) => b.avgScore - a.avgScore)
                  .map((s: any) => (
                  <tr key={s.staffId} className="border-b border-gray-100">
                    <td className="py-3 px-2 font-medium text-gray-900">{s.fullName}</td>
                    <td className="py-3 px-2 text-center">{s.tasks}</td>
                    <td className="py-3 px-2 text-center text-green-600">{s.approved}</td>
                    <td className="py-3 px-2 text-center text-red-600">{s.rejected}</td>
                    <td className="py-3 px-2 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        s.avgScore >= 80 ? "bg-green-100 text-green-700" :
                        s.avgScore >= 60 ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {s.avgScore}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Issues Summary */}
      {issueStats.total > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Kerusakan Terbuka</h3>
            <Link href="/admin/housekeeping/issues" className="text-sm text-blue-600 hover:underline">
              Lihat Semua →
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: "Kritis", value: issueStats.critical, color: "text-red-600 bg-red-50" },
              { label: "Tinggi", value: issueStats.high, color: "text-orange-600 bg-orange-50" },
              { label: "Sedang", value: issueStats.medium, color: "text-yellow-600 bg-yellow-50" },
              { label: "Rendah", value: issueStats.low, color: "text-gray-600 bg-gray-50" },
            ].map((s) => (
              <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
                <div className="text-xl font-bold">{s.value}</div>
                <div className="text-xs mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
