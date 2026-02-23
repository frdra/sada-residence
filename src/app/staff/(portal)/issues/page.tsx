"use client";

import { useEffect, useState, useRef } from "react";

const ISSUE_TYPES = [
  { value: "electrical", label: "Listrik", icon: "💡", defaultSeverity: "high" },
  { value: "plumbing", label: "Pipa/Air", icon: "🚰", defaultSeverity: "high" },
  { value: "furniture", label: "Furniture", icon: "🪑", defaultSeverity: "medium" },
  { value: "appliance", label: "Peralatan", icon: "📺", defaultSeverity: "medium" },
  { value: "structural", label: "Bangunan", icon: "🏗️", defaultSeverity: "high" },
  { value: "other", label: "Lainnya", icon: "📋", defaultSeverity: "low" },
];

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

export default function StaffIssuesPage() {
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);

  // Form state
  const [selectedProperty, setSelectedProperty] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [issueType, setIssueType] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [issuesRes, profileRes] = await Promise.all([
        fetch("/api/staff/issues"),
        fetch("/api/staff/profile"),
      ]);
      const issuesData = await issuesRes.json();
      const profileData = await profileRes.json();
      setIssues(issuesData.issues || []);
      setProperties(profileData.properties || []);
      setRooms(profileData.rooms || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredRooms = rooms.filter((r: any) => r.property_id === selectedProperty);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("roomId", selectedRoom);
      form.append("propertyId", selectedProperty);
      form.append("issueType", issueType);
      form.append("severity", severity);
      form.append("title", title);
      if (description) form.append("description", description);
      photos.forEach((p, i) => form.append(`photo${i}`, p));

      const res = await fetch("/api/staff/issues", { method: "POST", body: form });
      if (res.ok) {
        setShowForm(false);
        resetForm();
        await loadData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedProperty("");
    setSelectedRoom("");
    setIssueType("");
    setSeverity("medium");
    setTitle("");
    setDescription("");
    setPhotos([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="p-4">
        <button onClick={() => setShowForm(false)} className="flex items-center gap-2 text-blue-600 text-sm font-medium mb-4">
          ← Kembali
        </button>

        <h2 className="font-bold text-lg text-gray-900 mb-4">Lapor Kerusakan</h2>

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

          {/* Issue Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Jenis Kerusakan</label>
            <div className="grid grid-cols-3 gap-2">
              {ISSUE_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => {
                    setIssueType(t.value);
                    setSeverity(t.defaultSeverity);
                  }}
                  className={`p-3 rounded-xl border text-center text-sm transition-colors ${
                    issueType === t.value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <span className="text-xl block mb-1">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Judul Masalah</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 text-base"
              placeholder="Contoh: Lampu kamar mandi mati"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi (opsional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 text-base"
              rows={3}
              placeholder="Jelaskan detail kerusakan..."
            />
          </div>

          {/* Photos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Foto Kerusakan</label>
            <div className="flex gap-2 flex-wrap">
              {photos.map((p, i) => (
                <div key={i} className="relative w-20 h-20">
                  <img src={URL.createObjectURL(p)} alt="" className="w-20 h-20 rounded-lg object-cover border" />
                  <button
                    type="button"
                    onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400"
                >
                  📷+
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setPhotos([...photos, file]);
                e.target.value = "";
              }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !selectedRoom || !issueType || !title}
            className="w-full py-4 bg-red-600 text-white font-bold rounded-2xl text-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Mengirim..." : "🔧 Kirim Laporan"}
          </button>
        </form>
      </div>
    );
  }

  // List view
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg text-gray-900">Laporan Kerusakan</h2>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors"
        >
          + Lapor
        </button>
      </div>

      {issues.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-4xl">✅</span>
          <p className="text-gray-500 mt-3">Tidak ada laporan kerusakan</p>
        </div>
      ) : (
        <div className="space-y-3">
          {issues.map((issue: any) => (
            <div key={issue.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{issue.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {issue.room?.room_number} • {issue.property?.name}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ml-2 ${SEVERITY_LABELS[issue.severity]?.color || ""}`}>
                  {SEVERITY_LABELS[issue.severity]?.label || issue.severity}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_LABELS[issue.status]?.color || ""}`}>
                  {STATUS_LABELS[issue.status]?.label || issue.status}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(issue.created_at).toLocaleDateString("id-ID")}
                </span>
              </div>
              {issue.photos?.length > 0 && (
                <div className="flex gap-2 mt-3">
                  {issue.photos.slice(0, 3).map((p: any) => (
                    <img key={p.id} src={p.photo_url} alt="" className="w-16 h-16 rounded-lg object-cover border" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
