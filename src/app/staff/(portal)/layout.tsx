"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";

const navItems = [
  { href: "/staff/dashboard", label: "Beranda", icon: "🏠" },
  { href: "/staff/attendance", label: "Absen", icon: "📸" },
  { href: "/staff/tasks", label: "Tugas", icon: "✅" },
  { href: "/staff/issues", label: "Kerusakan", icon: "🔧" },
  { href: "/staff/laundry", label: "Laundry", icon: "👕" },
];

export default function StaffPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [staffName, setStaffName] = useState("Staff");

  useEffect(() => {
    fetch("/api/staff/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.user?.fullName) setStaffName(d.user.fullName);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    router.push("/staff/login");
  };

  return (
    <div className="min-h-screen bg-concrete-100 flex flex-col">
      {/* Top Header */}
      <header className="bg-terracotta-500 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div>
          <h1 className="font-bold text-base">Sada Residence</h1>
          <p className="text-terracotta-100 text-xs">{staffName}</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-terracotta-100 hover:text-white text-sm px-3 py-1 rounded-lg hover:bg-terracotta-600 transition-colors"
        >
          Keluar
        </button>
      </header>

      {/* Content */}
      <main className="flex-1 pb-20 overflow-auto">{children}</main>

      {/* Bottom Navigation — mobile-friendly */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-concrete-200 z-50">
        <div className="flex">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center py-2 text-xs transition-colors ${
                  isActive
                    ? "text-terracotta-500 font-semibold"
                    : "text-concrete-600"
                }`}
              >
                <span className="text-xl mb-0.5">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
