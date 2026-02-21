"use client";

import { useEffect, useState } from "react";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
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

  if (!data) return <p className="text-gray-500">Gagal memuat data.</p>;

  const methodLabels: Record<string, string> = {
    qris: "QRIS",
    credit_card: "Kartu Kredit",
    bank_transfer: "Bank Transfer",
  };

  return (
    <div>
      {/* Revenue cards */}
      <div className="grid sm:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl border p-6">
          <p className="text-sm text-gray-500 mb-1">Total Pemasukan</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(data.totalRevenue || 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl border p-6">
          <p className="text-sm text-gray-500 mb-1">Belum Terbayar</p>
          <p className="text-2xl font-bold text-yellow-600">
            {formatCurrency(data.pendingRevenue || 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl border p-6">
          <p className="text-sm text-gray-500 mb-1">Tingkat Hunian</p>
          <p className="text-2xl font-bold text-blue-600">{data.occupancyRate || 0}%</p>
          <p className="text-xs text-gray-400">
            {data.occupiedRooms}/{data.totalRooms} kamar
          </p>
        </div>
      </div>

      {/* Payment method breakdown */}
      <div className="bg-white rounded-xl border p-6 mb-8">
        <h3 className="font-semibold mb-6">Pemasukan per Metode Pembayaran</h3>
        {data.paymentBreakdown && Object.keys(data.paymentBreakdown).length > 0 ? (
          <div className="space-y-4">
            {Object.entries(data.paymentBreakdown).map(([method, amount]) => {
              const total = Object.values(data.paymentBreakdown as Record<string, number>).reduce(
                (sum, v) => sum + v,
                0
              );
              const pct = total > 0 ? Math.round(((amount as number) / total) * 100) : 0;

              return (
                <div key={method}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium">
                      {methodLabels[method] || method}
                    </span>
                    <span>
                      {formatCurrency(amount as number)} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-brand-400 h-2 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">Belum ada data pembayaran.</p>
        )}
      </div>

      {/* Export */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold mb-4">Export Data</h3>
        <p className="text-sm text-gray-500 mb-4">
          Download data booking dalam format CSV untuk analisis lebih lanjut.
        </p>
        <button
          className="btn-outline text-sm"
          onClick={() => {
            // CSV export will be handled by a dedicated endpoint
            window.open("/api/admin/export?format=csv", "_blank");
          }}
        >
          Download CSV
        </button>
      </div>
    </div>
  );
}
