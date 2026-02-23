"use client";

import { useEffect, useState, useRef } from "react";
import type { AnalyticsData } from "@/types";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

type Period = "7d" | "30d" | "90d" | "365d";

interface OccupancyData {
  period: string;
  days: number;
  totalRooms: number;
  today: { occupied: number; available: number; rate: number };
  average: { occupied: number; rate: number };
  properties: {
    propertyId: string;
    propertyName: string;
    slug: string;
    totalRooms: number;
    avgOccupied: number;
    occupancyRate: number;
  }[];
  chart: { date: string; occupied: number; rate: number }[];
}

const periodLabels: Record<Period, string> = {
  "7d": "7 Hari",
  "30d": "30 Hari",
  "90d": "3 Bulan",
  "365d": "1 Tahun",
};

// ── Simple SVG Chart Component ──
function OccupancyChart({ data, totalRooms }: { data: { date: string; occupied: number; rate: number }[]; totalRooms: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; date: string; rate: number; occupied: number } | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
        Belum ada data
      </div>
    );
  }

  const maxRate = Math.max(...data.map((d) => d.rate), 10);
  const chartH = 240;
  const chartW = 800;
  const padL = 45;
  const padR = 15;
  const padT = 15;
  const padB = 35;
  const innerW = chartW - padL - padR;
  const innerH = chartH - padT - padB;

  const points = data.map((d, i) => {
    const x = padL + (i / (data.length - 1 || 1)) * innerW;
    const y = padT + innerH - (d.rate / maxRate) * innerH;
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1].x},${padT + innerH} L${points[0].x},${padT + innerH} Z`;

  // Y-axis labels
  const yTicks = [0, 25, 50, 75, 100].filter((v) => v <= Math.ceil(maxRate / 10) * 10);
  // X-axis labels (show ~5 dates)
  const xStep = Math.max(1, Math.floor(data.length / 5));
  const xLabels = data.filter((_, i) => i % xStep === 0 || i === data.length - 1);

  return (
    <div ref={containerRef} className="relative">
      <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-64">
        {/* Grid lines */}
        {yTicks.map((v) => {
          const y = padT + innerH - (v / maxRate) * innerH;
          return (
            <g key={v}>
              <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke="#e5e7eb" strokeWidth={1} />
              <text x={padL - 8} y={y + 4} textAnchor="end" className="text-[10px]" fill="#9ca3af">
                {v}%
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill="url(#occupancyGradient)" />
        <defs>
          <linearGradient id="occupancyGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Line */}
        <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeLinejoin="round" />

        {/* Data points (interactive) */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={data.length <= 31 ? 3.5 : 2}
            fill="#3b82f6"
            stroke="white"
            strokeWidth={1.5}
            className="cursor-pointer hover:r-5"
            onMouseEnter={() => setTooltip({ x: p.x, date: p.date, rate: p.rate, occupied: p.occupied })}
            onMouseLeave={() => setTooltip(null)}
          />
        ))}

        {/* X-axis labels */}
        {xLabels.map((d) => {
          const idx = data.indexOf(d);
          const x = padL + (idx / (data.length - 1 || 1)) * innerW;
          const label = new Date(d.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
          return (
            <text key={d.date} x={x} y={chartH - 5} textAnchor="middle" className="text-[10px]" fill="#9ca3af">
              {label}
            </text>
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute bg-navy-900 text-white text-xs rounded-lg px-3 py-2 pointer-events-none shadow-lg"
          style={{
            left: `${(tooltip.x / chartW) * 100}%`,
            top: "0",
            transform: "translateX(-50%)",
          }}
        >
          <p className="font-medium">{new Date(tooltip.date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
          <p>Terisi: {tooltip.occupied}/{totalRooms} ({tooltip.rate}%)</p>
        </div>
      )}
    </div>
  );
}

// ── Occupancy Ring ──
function OccupancyRing({ rate, size = 80, label }: { rate: number; size?: number; label?: string }) {
  const r = (size - 8) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (rate / 100) * circumference;
  const color = rate >= 80 ? "#22c55e" : rate >= 50 ? "#3b82f6" : rate >= 25 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={6} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <span className="text-lg font-bold -mt-[52px] mb-6">{rate}%</span>
      {label && <span className="text-xs text-gray-500 mt-1">{label}</span>}
    </div>
  );
}

// ── Main Page ──
export default function OverviewPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [occupancy, setOccupancy] = useState<OccupancyData | null>(null);
  const [period, setPeriod] = useState<Period>("30d");
  const [loading, setLoading] = useState(true);
  const [occLoading, setOccLoading] = useState(true);

  // Fetch basic analytics
  useEffect(() => {
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then(setAnalytics)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Fetch occupancy data when period changes
  useEffect(() => {
    setOccLoading(true);
    fetch(`/api/admin/occupancy?period=${period}`)
      .then((r) => r.json())
      .then(setOccupancy)
      .catch(console.error)
      .finally(() => setOccLoading(false));
  }, [period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-900" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Revenue Stats */}
      {analytics && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <p className="text-sm text-gray-500 mb-1">Total Pemasukan</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(analytics.totalRevenue)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <p className="text-sm text-gray-500 mb-1">Belum Terbayar</p>
            <p className="text-2xl font-bold text-yellow-600">
              {formatCurrency(analytics.pendingRevenue)}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <p className="text-sm text-gray-500 mb-1">Booking (30 hari)</p>
            <p className="text-2xl font-bold text-purple-600">
              {analytics.recentBookings}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <p className="text-sm text-gray-500 mb-1">Hari Ini</p>
            {occupancy ? (
              <>
                <p className="text-2xl font-bold text-blue-600">
                  {occupancy.today.rate}%
                </p>
                <p className="text-xs text-gray-400">
                  {occupancy.today.occupied}/{occupancy.totalRooms} kamar terisi
                </p>
              </>
            ) : (
              <div className="animate-pulse h-8 bg-gray-100 rounded w-16" />
            )}
          </div>
        </div>
      )}

      {/* Occupancy Section */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="font-display text-lg font-bold">Tingkat Keterisian</h3>
            <p className="text-sm text-gray-500">Rata-rata okupansi seluruh properti</p>
          </div>
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(["7d", "30d", "90d", "365d"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  period === p
                    ? "bg-white text-navy-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
        </div>

        {occLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-navy-900" />
          </div>
        ) : occupancy ? (
          <>
            {/* Average rate badge */}
            <div className="flex items-center gap-4 mb-6 bg-blue-50 rounded-xl p-4">
              <OccupancyRing rate={occupancy.average.rate} />
              <div>
                <p className="font-semibold text-navy-900">
                  Rata-rata {periodLabels[period]}
                </p>
                <p className="text-sm text-gray-600">
                  {occupancy.average.occupied} dari {occupancy.totalRooms} kamar terisi
                </p>
              </div>
            </div>

            {/* Chart */}
            <OccupancyChart data={occupancy.chart} totalRooms={occupancy.totalRooms} />
          </>
        ) : (
          <p className="text-gray-400 text-sm">Gagal memuat data okupansi.</p>
        )}
      </div>

      {/* Per-Property Occupancy */}
      {occupancy && occupancy.properties.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="font-display text-lg font-bold mb-2">Keterisian per Properti</h3>
          <p className="text-sm text-gray-500 mb-6">
            Rata-rata okupansi {periodLabels[period]} terakhir
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {occupancy.properties.map((p) => {
              const color =
                p.occupancyRate >= 80
                  ? "from-green-500 to-green-600"
                  : p.occupancyRate >= 50
                  ? "from-blue-500 to-blue-600"
                  : p.occupancyRate >= 25
                  ? "from-yellow-500 to-yellow-600"
                  : "from-red-400 to-red-500";
              const bgColor =
                p.occupancyRate >= 80
                  ? "bg-green-50"
                  : p.occupancyRate >= 50
                  ? "bg-blue-50"
                  : p.occupancyRate >= 25
                  ? "bg-yellow-50"
                  : "bg-red-50";

              return (
                <div key={p.propertyId} className={`rounded-xl p-5 ${bgColor}`}>
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-sm text-navy-900 leading-tight">
                      {p.propertyName.replace("Sada Residence ", "")}
                    </h4>
                    <span className={`text-2xl font-bold bg-gradient-to-r ${color} bg-clip-text text-transparent`}>
                      {p.occupancyRate}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-white/60 rounded-full h-2.5 mb-2">
                    <div
                      className={`h-2.5 rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
                      style={{ width: `${p.occupancyRate}%` }}
                    />
                  </div>

                  <p className="text-xs text-gray-600">
                    {p.avgOccupied} dari {p.totalRooms} kamar
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Payment Breakdown */}
      {analytics?.paymentBreakdown && Object.keys(analytics.paymentBreakdown).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h3 className="font-display text-lg font-bold mb-4">Metode Pembayaran</h3>
          <div className="space-y-3">
            {Object.entries(analytics.paymentBreakdown).map(([method, amount]) => {
              const total = Object.values(analytics.paymentBreakdown).reduce((s, v) => s + v, 0);
              const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
              const label =
                method === "qris" ? "QRIS" : method === "credit_card" ? "Kartu Kredit" : "Bank Transfer";
              return (
                <div key={method}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{label}</span>
                    <span>{formatCurrency(amount)} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-brand-400 h-2 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
