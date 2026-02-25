"use client";

import { useState, useEffect } from "react";

interface StaffAttendance {
  id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  clock_in_photo_url: string | null;
  clock_out_photo_url: string | null;
  clock_in_latitude: number | null;
  clock_in_longitude: number | null;
  clock_in_address: string | null;
  clock_out_address: string | null;
  is_late: boolean;
  late_minutes: number;
  work_duration_minutes: number | null;
  is_early_leave: boolean;
  status: string;
  admin_notes: string | null;
  staff: { id: string; full_name: string } | null;
}

interface StaffSummary {
  staffId: string;
  staffName: string;
  totalPresent: number;
  totalLate: number;
  totalAbsent: number;
  totalEarlyLeave: number;
  avgWorkMinutes: number;
  totalLateMinutes: number;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  present: { label: "Hadir", color: "bg-green-100 text-green-700" },
  late: { label: "Terlambat", color: "bg-yellow-100 text-yellow-700" },
  absent: { label: "Tidak Hadir", color: "bg-red-100 text-red-700" },
  half_day: { label: "½ Hari", color: "bg-orange-100 text-orange-700" },
  leave: { label: "Cuti", color: "bg-blue-100 text-blue-700" },
  sick: { label: "Sakit", color: "bg-purple-100 text-purple-700" },
};

export default function AdminAttendancePage() {
  const [tab, setTab] = useState<"daily" | "summary">("daily");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [attendance, setAttendance] = useState<StaffAttendance[]>([]);
  const [allStaff, setAllStaff] = useState<{ id: string; full_name: string; is_active: boolean }[]>([]);
  const [summary, setSummary] = useState<StaffSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const fetchDaily = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/attendance?mode=daily&date=${date}`);
      const data = await res.json();
      setAttendance(data.attendance || []);
      setAllStaff(data.allStaff || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/attendance?mode=summary&month=${month}`);
      const data = await res.json();
      setSummary(data.summary || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    if (tab === "daily") fetchDaily();
    else fetchSummary();
  }, [tab, date, month]);

  const formatTime = (t: string | null) => {
    if (!t) return "—";
    return new Date(t).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDuration = (m: number | null) => {
    if (!m) return "—";
    return `${Math.floor(m / 60)}j ${m % 60}m`;
  };

  // Find absent staff for daily view
  const attendedStaffIds = new Set(attendance.map((a) => a.staff?.id));
  const absentStaff = allStaff.filter((s) => !attendedStaffIds.has(s.id));

  return (
    <div>
      <h1 className="text-2xl font-bold text-navy-900 mb-6">Absensi Staff</h1>

      {/* Tabs + Date Picker */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setTab("daily")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "daily" ? "bg-white shadow-sm text-blue-600" : "text-gray-500"}`}
          >
            Harian
          </button>
          <button
            onClick={() => setTab("summary")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${tab === "summary" ? "bg-white shadow-sm text-blue-600" : "text-gray-500"}`}
          >
            Rekap Bulanan
          </button>
        </div>
        {tab === "daily" ? (
          <input
            type="date"
            className="input-field !w-auto"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        ) : (
          <input
            type="month"
            className="input-field !w-auto"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Memuat...</div>
      ) : tab === "daily" ? (
        /* ── Daily View ── */
        <div className="space-y-4">
          {/* Quick stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 border text-center">
              <p className="text-2xl font-bold text-green-600">{attendance.filter((a) => a.clock_in).length}</p>
              <p className="text-xs text-gray-500">Hadir</p>
            </div>
            <div className="bg-white rounded-xl p-4 border text-center">
              <p className="text-2xl font-bold text-yellow-600">{attendance.filter((a) => a.is_late).length}</p>
              <p className="text-xs text-gray-500">Terlambat</p>
            </div>
            <div className="bg-white rounded-xl p-4 border text-center">
              <p className="text-2xl font-bold text-red-600">{absentStaff.length}</p>
              <p className="text-xs text-gray-500">Tidak Hadir</p>
            </div>
            <div className="bg-white rounded-xl p-4 border text-center">
              <p className="text-2xl font-bold text-blue-600">{attendance.filter((a) => a.clock_out).length}</p>
              <p className="text-xs text-gray-500">Sudah Pulang</p>
            </div>
          </div>

          {/* Attendance Table */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Staff</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Masuk</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Pulang</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Durasi</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Foto</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Lokasi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {attendance.map((a) => {
                  const st = statusLabels[a.status] || statusLabels.present;
                  return (
                    <tr key={a.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{a.staff?.full_name || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={a.is_late ? "text-yellow-600 font-medium" : "text-green-600"}>
                          {formatTime(a.clock_in)}
                        </span>
                        {a.is_late && <p className="text-[10px] text-yellow-500">+{a.late_minutes}m</p>}
                      </td>
                      <td className="px-4 py-3 text-blue-600">{formatTime(a.clock_out)}</td>
                      <td className="px-4 py-3">{formatDuration(a.work_duration_minutes)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${st.color}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {a.clock_in_photo_url && (
                            <button onClick={() => setSelectedPhoto(a.clock_in_photo_url)}>
                              <img src={a.clock_in_photo_url} alt="In" className="w-8 h-8 rounded object-cover border hover:opacity-80" />
                            </button>
                          )}
                          {a.clock_out_photo_url && (
                            <button onClick={() => setSelectedPhoto(a.clock_out_photo_url)}>
                              <img src={a.clock_out_photo_url} alt="Out" className="w-8 h-8 rounded object-cover border hover:opacity-80" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        {a.clock_in_address && (
                          <p className="text-[10px] text-gray-400 truncate" title={a.clock_in_address}>
                            📍 {a.clock_in_address}
                          </p>
                        )}
                        {a.clock_in_latitude && (
                          <a
                            href={`https://maps.google.com/?q=${a.clock_in_latitude},${a.clock_in_longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-blue-500 hover:underline"
                          >
                            Lihat di Maps
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {/* Absent staff */}
                {absentStaff.map((s) => (
                  <tr key={s.id} className="bg-red-50/50">
                    <td className="px-4 py-3 font-medium text-red-600">{s.full_name}</td>
                    <td className="px-4 py-3 text-gray-300">—</td>
                    <td className="px-4 py-3 text-gray-300">—</td>
                    <td className="px-4 py-3 text-gray-300">—</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">Tidak Hadir</span>
                    </td>
                    <td className="px-4 py-3 text-gray-300">—</td>
                    <td className="px-4 py-3 text-gray-300">—</td>
                  </tr>
                ))}
                {attendance.length === 0 && absentStaff.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">Tidak ada data</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ── Monthly Summary ── */
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Staff</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Hadir</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Terlambat</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Total Telat</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Pulang Awal</th>
                <th className="text-center px-4 py-3 font-medium text-gray-500">Rata-rata Kerja</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {summary.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">Tidak ada data untuk bulan ini</td>
                </tr>
              ) : (
                summary.map((s) => (
                  <tr key={s.staffId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{s.staffName}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">{s.totalPresent} hari</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.totalLate > 0 ? (
                        <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-medium">{s.totalLate}x</span>
                      ) : (
                        <span className="text-gray-300">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.totalLateMinutes > 0 ? (
                        <span className="text-yellow-600 text-xs font-medium">{s.totalLateMinutes}m</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.totalEarlyLeave > 0 ? (
                        <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-medium">{s.totalEarlyLeave}x</span>
                      ) : (
                        <span className="text-gray-300">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-medium">
                      {formatDuration(s.avgWorkMinutes)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Photo Preview Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSelectedPhoto(null)}>
          <div className="max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <img src={selectedPhoto} alt="Attendance photo" className="w-full rounded-2xl" />
            <button onClick={() => setSelectedPhoto(null)} className="mt-3 w-full py-2 bg-white/90 rounded-xl text-sm font-medium">
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
