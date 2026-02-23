"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Menunggu", color: "bg-gray-100 text-gray-700" },
  in_progress: { label: "Dikerjakan", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Selesai", color: "bg-green-100 text-green-700" },
  needs_review: { label: "Perlu Review", color: "bg-yellow-100 text-yellow-700" },
  approved: { label: "Disetujui", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Ditolak", color: "bg-red-100 text-red-700" },
};

export default function AdminHousekeepingTasksPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-32"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" /></div>}>
      <TasksContent />
    </Suspense>
  );
}

function TasksContent() {
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState(searchParams.get("status") || "");
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0]);
  const [reviewTask, setReviewTask] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTasks();
  }, [filterStatus, filterDate]);

  const loadTasks = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterDate) params.set("date", filterDate);
    if (filterStatus) params.set("status", filterStatus);

    try {
      const res = await fetch(`/api/admin/housekeeping/tasks?${params}`);
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (approve: boolean) => {
    if (!reviewTask) return;
    setSubmitting(true);
    try {
      await fetch(`/api/staff/tasks/${reviewTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "review",
          adminRating: rating,
          adminNotes: adminNotes || undefined,
          rejectionReason: !approve ? rejectionReason : undefined,
        }),
      });
      setReviewTask(null);
      setRating(0);
      setAdminNotes("");
      setRejectionReason("");
      await loadTasks();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Review Tugas</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm"
        >
          <option value="">Semua Status</option>
          <option value="needs_review">Perlu Review</option>
          <option value="approved">Disetujui</option>
          <option value="rejected">Ditolak</option>
          <option value="pending">Menunggu</option>
          <option value="in_progress">Dikerjakan</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">Tidak ada tugas</div>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task: any) => {
            const beforePhotos = (task.photos || []).filter((p: any) => p.photo_type === "before");
            const afterPhotos = (task.photos || []).filter((p: any) => p.photo_type === "after");
            const checklist = task.checklist || [];
            const completed = checklist.filter((c: any) => c.is_completed).length;

            return (
              <div key={task.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-gray-900">
                      Kamar {task.room?.room_number}
                      <span className="font-normal text-gray-500 ml-2 text-sm">
                        {task.property?.name?.replace("Sada Residence ", "")}
                      </span>
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Staff: {task.staff?.full_name || "–"} • {task.task_date}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_LABELS[task.status]?.color || ""}`}>
                    {STATUS_LABELS[task.status]?.label || task.status}
                  </span>
                </div>

                {/* Photos side by side */}
                {(beforePhotos.length > 0 || afterPhotos.length > 0) && (
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">SEBELUM</p>
                      <div className="flex gap-2 flex-wrap">
                        {beforePhotos.map((p: any) => (
                          <a key={p.id} href={p.photo_url} target="_blank" rel="noopener noreferrer">
                            <img src={p.photo_url} alt="Before" className="w-24 h-24 rounded-lg object-cover border hover:opacity-80" />
                          </a>
                        ))}
                        {beforePhotos.length === 0 && (
                          <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                            Tidak ada
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">SESUDAH</p>
                      <div className="flex gap-2 flex-wrap">
                        {afterPhotos.map((p: any) => (
                          <a key={p.id} href={p.photo_url} target="_blank" rel="noopener noreferrer">
                            <img src={p.photo_url} alt="After" className="w-24 h-24 rounded-lg object-cover border hover:opacity-80" />
                          </a>
                        ))}
                        {afterPhotos.length === 0 && (
                          <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                            Tidak ada
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Checklist summary + scores */}
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span>Checklist: {completed}/{checklist.length}</span>
                  {task.total_score !== null && (
                    <span className={`font-bold ${
                      task.total_score >= 80 ? "text-green-600" :
                      task.total_score >= 60 ? "text-yellow-600" : "text-red-600"
                    }`}>
                      Skor: {task.total_score}
                    </span>
                  )}
                  {task.admin_rating && (
                    <span>{"⭐".repeat(task.admin_rating)}</span>
                  )}
                  {task.started_at && task.completed_at && (
                    <span className="text-gray-400">
                      Durasi: {Math.round(
                        (new Date(task.completed_at).getTime() - new Date(task.started_at).getTime()) / 60000
                      )} menit
                    </span>
                  )}
                </div>

                {/* Review button */}
                {task.status === "needs_review" && (
                  <button
                    onClick={() => { setReviewTask(task); setRating(0); setAdminNotes(""); setRejectionReason(""); }}
                    className="mt-3 px-4 py-2 bg-yellow-500 text-white text-sm font-semibold rounded-lg hover:bg-yellow-600 transition-colors"
                  >
                    Review & Nilai
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      {reviewTask && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-bold mb-4">
              Review Kamar {reviewTask.room?.room_number}
            </h3>

            <div className="mb-4 bg-gray-50 rounded-xl p-3 text-sm">
              <p>Staff: {reviewTask.staff?.full_name}</p>
              <p>Skor Otomatis: {reviewTask.total_score}</p>
              <p>Checklist: {reviewTask.checklist?.filter((c: any) => c.is_completed).length}/{reviewTask.checklist?.length}</p>
            </div>

            {/* Star Rating */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Rating (1-5)</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`text-3xl transition-transform ${
                      star <= rating ? "scale-110" : "opacity-30"
                    }`}
                  >
                    ⭐
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (opsional)</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                rows={2}
                placeholder="Catatan untuk karyawan..."
              />
            </div>

            {/* Rejection reason */}
            {rating > 0 && rating < 3 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-red-700 mb-1">Alasan Penolakan</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-red-300 text-sm"
                  rows={2}
                  placeholder="Jelaskan apa yang harus diperbaiki..."
                />
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setReviewTask(null)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                Batal
              </button>
              {rating > 0 && rating < 3 && (
                <button
                  onClick={() => handleReview(false)}
                  disabled={submitting || !rejectionReason}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  Tolak
                </button>
              )}
              {rating >= 3 && (
                <button
                  onClick={() => handleReview(true)}
                  disabled={submitting}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {submitting ? "..." : "Setujui"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
