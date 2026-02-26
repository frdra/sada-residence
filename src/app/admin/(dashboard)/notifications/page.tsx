"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  icon: string;
  action_url: string | null;
  is_read: boolean;
  reference_type: string | null;
  created_at: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const TYPE_LABELS: Record<string, string> = {
  new_booking: "Booking Baru",
  payment_received: "Pembayaran",
  onsite_payment: "Pembayaran Lokasi",
  check_in: "Check-In",
  check_out: "Check-Out",
  issue_reported: "Kerusakan",
  staff_late: "Staff Terlambat",
  staff_absent: "Staff Absen",
};

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/notifications?limit=100");
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAllRead = async () => {
    try {
      await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_all_read" }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // ignore
    }
  };

  const markRead = async (id: string) => {
    try {
      await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_read", id }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch {
      // ignore
    }
  };

  const handleClick = (notif: Notification) => {
    if (!notif.is_read) markRead(notif.id);
    if (notif.action_url) router.push(notif.action_url);
  };

  // Get unique types
  const types = Array.from(new Set(notifications.map((n) => n.type)));

  // Filter
  let filtered = notifications;
  if (filter === "unread") {
    filtered = filtered.filter((n) => !n.is_read);
  }
  if (typeFilter !== "all") {
    filtered = filtered.filter((n) => n.type === typeFilter);
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Notifikasi</h1>
          <p className="text-sm text-gray-500 mt-1">
            {unreadCount > 0
              ? `${unreadCount} belum dibaca`
              : "Semua sudah dibaca"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="px-4 py-2 text-sm bg-navy-900 text-white rounded-lg hover:bg-navy-800 transition-colors"
          >
            Tandai Semua Dibaca
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 text-sm transition-colors ${
              filter === "all"
                ? "bg-navy-900 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-4 py-2 text-sm transition-colors ${
              filter === "unread"
                ? "bg-navy-900 text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Belum Dibaca
          </button>
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white"
        >
          <option value="all">Semua Tipe</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {TYPE_LABELS[t] || t}
            </option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400">Memuat...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            {filter === "unread"
              ? "Tidak ada notifikasi yang belum dibaca"
              : "Belum ada notifikasi"}
          </div>
        ) : (
          filtered.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={`w-full text-left px-5 py-4 hover:bg-gray-50 border-b border-gray-100 transition-colors flex gap-4 items-start ${
                !n.is_read ? "bg-blue-50/40" : ""
              }`}
            >
              <span className="text-2xl shrink-0 mt-0.5">{n.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className={`text-sm ${
                      !n.is_read
                        ? "font-semibold text-gray-900"
                        : "text-gray-700"
                    }`}
                  >
                    {n.title}
                  </span>
                  {!n.is_read && (
                    <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
                  )}
                  <span className="text-xs text-gray-400 ml-auto shrink-0">
                    {timeAgo(n.created_at)}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{n.message}</p>
                <span className="inline-block mt-1 text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                  {TYPE_LABELS[n.type] || n.type}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
