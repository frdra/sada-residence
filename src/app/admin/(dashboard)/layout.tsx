"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
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

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-navy-900 text-white transform transition-transform duration-200 lg:translate-x-0 lg:static ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 border-b border-navy-800">
          <Link href="/admin/overview" className="block">
            <h1 className="font-display text-xl font-bold">
              Sada <span className="text-brand-400">Residence</span>
            </h1>
            <p className="text-xs text-gray-400 mt-1">Admin Dashboard</p>
          </Link>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                pathname === item.href || pathname.startsWith(item.href + "/")
                  ? "bg-navy-800 text-white font-medium"
                  : "text-gray-400 hover:bg-navy-800/50 hover:text-white"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-navy-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm text-gray-400 hover:bg-navy-800/50 hover:text-white transition-colors w-full"
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
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-navy-900">
              {navItems.find((n) => pathname.startsWith(n.href))?.label || "Dashboard"}
            </h2>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
