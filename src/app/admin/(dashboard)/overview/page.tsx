"use client";

import { useEffect, useState } from "react";
import type { AnalyticsData } from "@/types";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function OverviewPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-900" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-gray-500">Gagal memuat data.</p>;
  }

  const stats = [
    {
      label: "Total Pemasukan",
      value: formatCurrency(data.totalRevenue),
      color: "bg-green-50 text-green-700",
    },
    {
      label: "Belum Terbayar",
      value: formatCurrency(data.pendingRevenue),
      color: "bg-yellow-50 text-yellow-700",
    },
    {
      label: "Tingkat Hunian",
      value: `${data.occupancyRate}%`,
      sub: `${data.occupiedRooms}/${data.totalRooms} kamar`,
      color: "bg-blue-50 text-blue-700",
    },
    {
      label: "Booking (30 hari)",
      value: data.recentBookings.toString(),
      color: "bg-purple-50 text-purple-700",
    },
  ];

  return (
    <div>
      {/* Stats grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-6">
            <p className="text-sm text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color.split(" ")[1]}`}>
              {s.value}
            </p>
            {s.sub && <p className="text-xs text-gray-400 mt-1">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Payment breakdown */}
      {data.paymentBreakdown && Object.keys(data.paymentBreakdown).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="font-semibold mb-4">Pemasukan per Metode Pembayaran</h3>
          <div className="space-y-3">
            {Object.entries(data.paymentBreakdown).map(([method, amount]) => (
              <div key={method} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">
                  {method === "qris"
                    ? "QRIS"
                    : method === "credit_card"
                    ? "Kartu Kredit"
                    : "Bank Transfer"}
                </span>
                <span className="font-semibold">{formatCurrency(amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
