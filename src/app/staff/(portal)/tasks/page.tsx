"use client";

import { useEffect, useState, useRef } from "react";

interface Task {
  id: string;
  room_id: string;
  property_id: string;
  task_type: string;
  task_date: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  total_score: number | null;
  admin_rating: number | null;
  rejection_reason: string | null;
  room?: { room_number: string; floor: number };
  property?: { name: string };
  photos?: any[];
  checklist?: any[];
}

interface ChecklistItem {
  id: string;
  checklist_item_id: string;
  is_completed: boolean;
  notes: string | null;
  checklist_item?: {
    id: string;
    category: string;
    item_name: string;
    description: string | null;
    is_required: boolean;
  };
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Menunggu", color: "bg-gray-100 text-gray-700" },
  in_progress: { label: "Dikerjakan", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Selesai", color: "bg-green-100 text-green-700" },
  needs_review: { label: "Menunggu Review", color: "bg-yellow-100 text-yellow-700" },
  approved: { label: "Disetujui", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Ditolak", color: "bg-red-100 text-red-700" },
};

const TASK_TYPE_LABELS: Record<string, string> = {
  checkout_clean: "Checkout Clean",
  occupied_clean: "Harian",
  deep_clean: "Deep Clean",
  inspection: "Inspeksi",
};

const CATEGORY_LABELS: Record<string, string> = {
  kamar_tidur: "Kamar Tidur",
  kamar_mandi: "Kamar Mandi",
  area_umum: "Area Umum",
  perlengkapan: "Perlengkapan",
};

export default function StaffTasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoType, setPhotoType] = useState<"before" | "after">("before");

  const today = new Date().toISOString().split("T")[0];

  const loadTasks = async () => {
    try {
      const res = await fetch(`/api/staff/tasks?date=${today}`);
      const data = await res.json();
      setTasks(data.tasks || []);
      // Refresh active task if open
      if (activeTask) {
        const updated = (data.tasks || []).find((t: Task) => t.id === activeTask.id);
        if (updated) setActiveTask(updated);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [today]);

  const handleAction = async (taskId: string, action: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/staff/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) await loadTasks();
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleChecklist = async (taskId: string, checklistItemId: string, completed: boolean) => {
    try {
      await fetch(`/api/staff/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_checklist",
          checklistItemId,
          checklistCompleted: completed,
        }),
      });
      await loadTasks();
    } catch (e) {
      console.error(e);
    }
  };

  const handlePhotoUpload = async (taskId: string, file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("photo", file);
      form.append("photoType", photoType);
      const res = await fetch(`/api/staff/tasks/${taskId}/photos`, {
        method: "POST",
        body: form,
      });
      if (res.ok) await loadTasks();
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Task detail view
  if (activeTask) {
    const checklist = (activeTask.checklist || []) as ChecklistItem[];
    const grouped = checklist.reduce((acc: Record<string, ChecklistItem[]>, item) => {
      const cat = item.checklist_item?.category || "other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {});

    const totalChecked = checklist.filter((c) => c.is_completed).length;
    const totalItems = checklist.length;
    const progress = totalItems > 0 ? Math.round((totalChecked / totalItems) * 100) : 0;

    const beforePhotos = (activeTask.photos || []).filter((p: any) => p.photo_type === "before");
    const afterPhotos = (activeTask.photos || []).filter((p: any) => p.photo_type === "after");

    return (
      <div className="p-4 space-y-4">
        {/* Back button */}
        <button
          onClick={() => setActiveTask(null)}
          className="flex items-center gap-2 text-blue-600 text-sm font-medium"
        >
          ← Kembali
        </button>

        {/* Task header */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-lg text-gray-900">
              Kamar {activeTask.room?.room_number}
            </h2>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_LABELS[activeTask.status]?.color || "bg-gray-100"}`}>
              {STATUS_LABELS[activeTask.status]?.label || activeTask.status}
            </span>
          </div>
          <p className="text-sm text-gray-500">
            {activeTask.property?.name} • Lt. {activeTask.room?.floor} • {TASK_TYPE_LABELS[activeTask.task_type] || activeTask.task_type}
          </p>
          {activeTask.rejection_reason && (
            <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-xs font-medium text-red-700">Alasan Penolakan:</p>
              <p className="text-sm text-red-600 mt-1">{activeTask.rejection_reason}</p>
            </div>
          )}
        </div>

        {/* Start button for pending */}
        {(activeTask.status === "pending" || activeTask.status === "rejected") && (
          <button
            onClick={() => handleAction(activeTask.id, "start")}
            disabled={actionLoading}
            className="w-full py-4 bg-blue-600 text-white font-bold rounded-2xl text-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {actionLoading ? "Memproses..." : "🧹 Mulai Bersihkan"}
          </button>
        )}

        {/* Photo section (for in_progress) */}
        {activeTask.status === "in_progress" && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">Foto Dokumentasi</h3>

            {/* Before photos */}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Foto Sebelum ({beforePhotos.length})
              </p>
              <div className="flex gap-2 flex-wrap">
                {beforePhotos.map((p: any) => (
                  <img
                    key={p.id}
                    src={p.photo_url}
                    alt="Before"
                    className="w-20 h-20 rounded-lg object-cover border"
                  />
                ))}
                <button
                  onClick={() => {
                    setPhotoType("before");
                    fileInputRef.current?.click();
                  }}
                  disabled={uploading}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-400"
                >
                  {uploading && photoType === "before" ? "..." : "📷+"}
                </button>
              </div>
            </div>

            {/* After photos */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">
                Foto Sesudah ({afterPhotos.length})
              </p>
              <div className="flex gap-2 flex-wrap">
                {afterPhotos.map((p: any) => (
                  <img
                    key={p.id}
                    src={p.photo_url}
                    alt="After"
                    className="w-20 h-20 rounded-lg object-cover border"
                  />
                ))}
                <button
                  onClick={() => {
                    setPhotoType("after");
                    fileInputRef.current?.click();
                  }}
                  disabled={uploading}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-blue-400 hover:text-blue-400"
                >
                  {uploading && photoType === "after" ? "..." : "📷+"}
                </button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePhotoUpload(activeTask.id, file);
                e.target.value = "";
              }}
            />
          </div>
        )}

        {/* Checklist (for in_progress) */}
        {activeTask.status === "in_progress" && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Checklist SOP</h3>
              <span className="text-sm text-gray-500">{totalChecked}/{totalItems} ({progress}%)</span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            {Object.entries(grouped)
              .sort(([, a], [, b]) => (a[0]?.checklist_item?.sort_order || 0) - (b[0]?.checklist_item?.sort_order || 0))
              .map(([category, items]) => (
              <div key={category} className="mb-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  {CATEGORY_LABELS[category] || category}
                </h4>
                <div className="space-y-2">
                  {(items as ChecklistItem[]).map((item) => (
                    <label
                      key={item.id}
                      className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 cursor-pointer hover:bg-gray-100"
                    >
                      <input
                        type="checkbox"
                        checked={item.is_completed}
                        onChange={() =>
                          handleChecklist(
                            activeTask.id,
                            item.checklist_item_id,
                            !item.is_completed
                          )
                        }
                        className="mt-0.5 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${item.is_completed ? "line-through text-gray-400" : "text-gray-900"}`}>
                          {item.checklist_item?.item_name}
                          {item.checklist_item?.is_required && (
                            <span className="text-red-500 ml-1">*</span>
                          )}
                        </p>
                        {item.checklist_item?.description && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {item.checklist_item.description}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Complete button */}
        {activeTask.status === "in_progress" && (
          <button
            onClick={() => handleAction(activeTask.id, "complete")}
            disabled={actionLoading || beforePhotos.length === 0}
            className="w-full py-4 bg-green-600 text-white font-bold rounded-2xl text-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {actionLoading ? "Memproses..." : "✅ Selesai & Kirim Review"}
          </button>
        )}

        {beforePhotos.length === 0 && activeTask.status === "in_progress" && (
          <p className="text-center text-xs text-red-500">
            Foto sebelum wajib diambil sebelum menyelesaikan tugas
          </p>
        )}

        {/* Score display for reviewed tasks */}
        {(activeTask.status === "approved" || activeTask.status === "needs_review") &&
          activeTask.total_score !== null && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-3">Skor Penilaian</h3>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600">
                {activeTask.total_score}
              </div>
              <p className="text-sm text-gray-500">dari 100</p>
            </div>
            {activeTask.admin_rating && (
              <div className="mt-3 text-center">
                <p className="text-sm text-gray-500">Rating Admin</p>
                <p className="text-xl">
                  {"⭐".repeat(activeTask.admin_rating)}{"☆".repeat(5 - activeTask.admin_rating)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Task list view
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-lg text-gray-900">Tugas Hari Ini</h2>
        <span className="text-sm text-gray-500">
          {new Date().toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })}
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-4xl">✨</span>
          <p className="text-gray-500 mt-3">Belum ada tugas hari ini</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <button
              key={task.id}
              onClick={() => setActiveTask(task)}
              className="w-full text-left bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:border-blue-200 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-gray-900">
                  Kamar {task.room?.room_number}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_LABELS[task.status]?.color || "bg-gray-100"}`}>
                  {STATUS_LABELS[task.status]?.label || task.status}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                {task.property?.name} • Lt. {task.room?.floor} • {TASK_TYPE_LABELS[task.task_type] || task.task_type}
              </p>
              {task.total_score !== null && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        task.total_score >= 80
                          ? "bg-green-500"
                          : task.total_score >= 60
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${task.total_score}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 font-medium">{task.total_score}</span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
