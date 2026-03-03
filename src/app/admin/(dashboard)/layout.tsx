"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";

const navItems = [
  { href: "/admin/overview", label: "Dashboard", icon: "📊" },
  { href: "/admin/rooms", label: "Kamar", icon: "🏠" },
  { href: "/admin/bookings", label: "Booking", icon: "📋" },
  { href: "/admin/pricing", label: "Harga", icon: "💲" },
  { href: "/admin/expenses", label: "Pengeluaran", icon: "📤" },
  { href: "/admin/housekeeping", label: "Housekeeping", icon: "🧹" },
  { href: "/admin/calendar", label: "Kalender", icon: "📅" },
  { href: "/admin/analytics", label: "Keuangan", icon: "💰" },
  { href: "/admin/settings", label: "Pengaturan", icon: "⚙️" },
];

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  icon: string;
  action_url: string | null;
  is_read: boolean;
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
  return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Notification state
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  // Fetch unread count (polling every 30s)
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications?mode=unread_count");
      const data = await res.json();
      setUnreadCount(data.count || 0);
    } catch {
      // ignore
    }
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications?limit=20");
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fetch full list when dropdown opens
  useEffect(() => {
    if (notifOpen) {
      fetchNotifications();
    }
  }, [notifOpen, fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const markAllRead = async () => {
    try {
      await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_all_read" }),
      });
      setUnreadCount(0);
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
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  };

  const handleNotifClick = (notif: Notification) => {
    if (!notif.is_read) markRead(notif.id);
    setNotifOpen(false);
    if (notif.action_url) router.push(notif.action_url);
  };

  return (
    <div className="min-h-screen bg-concrete-100 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-charcoal-800 text-white transform transition-transform duration-200 lg:translate-x-0 lg:static ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-charcoal-700">
          <Link href="/admin/overview" className="block">
            <h1 className="font-display text-xl font-light tracking-widest">
              SADA <span className="text-terracotta-400 text-sm font-body font-normal tracking-wider">RESIDENCE</span>
            </h1>
            <p className="text-xs text-concrete-600 mt-1 font-body">Admin Dashboard</p>
          </Link>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-body transition-colors ${
                pathname === item.href || pathname.startsWith(item.href + "/")
                  ? "bg-terracotta-500/20 text-terracotta-400 font-medium"
                  : "text-concrete-400 hover:bg-charcoal-700 hover:text-concrete-200"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-charcoal-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-concrete-600 hover:bg-charcoal-700 hover:text-concrete-200 transition-colors w-full font-body"
          >
            <span>🚪</span>
            Keluar
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-concrete-200 px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-charcoal-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1">
            <h2 className="text-lg font-display font-normal text-charcoal-800">
              {navItems.find((n) => pathname.startsWith(n.href))?.label || "Dashboard"}
            </h2>
          </div>

          {/* Notification bell */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative p-2 text-charcoal-600 hover:text-charcoal-800 hover:bg-concrete-100 rounded-xl transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-terracotta-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl shadow-xl border border-concrete-200 z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-concrete-200">
                  <h3 className="font-display font-normal text-charcoal-800 text-sm">Notifikasi</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      className="text-xs text-terracotta-500 hover:text-terracotta-700 font-medium"
                    >
                      Tandai semua dibaca
                    </button>
                  )}
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-10 text-center text-concrete-600 text-sm">
                      Belum ada notifikasi
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => handleNotifClick(n)}
                        className={`w-full text-left px-4 py-3 hover:bg-concrete-100 border-b border-concrete-100 transition-colors ${
                          !n.is_read ? "bg-terracotta-50" : ""
                        }`}
                      >
                        <div className="flex gap-3">
                          <span className="text-lg shrink-0 mt-0.5">{n.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm truncate ${!n.is_read ? "font-semibold text-charcoal-800" : "text-charcoal-600"}`}>
                                {n.title}
                              </p>
                              {!n.is_read && (
                                <span className="w-2 h-2 bg-terracotta-500 rounded-full shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-concrete-600 mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="text-xs text-concrete-500 mt-1">{timeAgo(n.created_at)}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className="px-4 py-2.5 border-t border-concrete-200 text-center">
                    <Link
                      href="/admin/notifications"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs text-terracotta-500 hover:text-terracotta-700 font-medium"
                    >
                      Lihat semua notifikasi
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
