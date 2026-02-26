"use client";

import { useEffect, useState, useCallback } from "react";

interface CategoryBreakdown {
  id: string;
  name: string;
  icon: string;
  color: string;
  total: number;
  count: number;
}

interface MonthlyData {
  month: string;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  bookingCount: number;
  expenseByCategory: CategoryBreakdown[];
}

interface YearlyMonth {
  month: string;
  income: number;
  expenses: number;
  profit: number;
}

interface YearlyData {
  year: number;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  months: YearlyMonth[];
  expenseByCategory: CategoryBreakdown[];
}

interface PropertyBreakdown {
  propertyId: string;
  propertyName: string;
  income: number;
  directExpenses: number;
  generalExpenseShare: number;
  totalExpenses: number;
  profit: number;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount);

const formatCompact = (amount: number) => {
  if (Math.abs(amount) >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}jt`;
  if (Math.abs(amount) >= 1_000) return `${(amount / 1_000).toFixed(0)}rb`;
  return String(amount);
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export default function AnalyticsPage() {
  const [view, setView] = useState<"monthly" | "yearly">("monthly");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [filterProperty, setFilterProperty] = useState<string>("");

  const [monthlyData, setMonthlyData] = useState<MonthlyData | null>(null);
  const [yearlyData, setYearlyData] = useState<YearlyData | null>(null);
  const [propertyBreakdown, setPropertyBreakdown] = useState<PropertyBreakdown[]>([]);
  const [loading, setLoading] = useState(true);

  const [properties, setProperties] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch("/api/admin/rates?mode=all")
      .then((r) => r.json())
      .then((data) => {
        const map = new Map<string, { id: string; name: string }>();
        data.rooms?.forEach((r: any) => {
          if (r.property) map.set(r.property.id, r.property);
        });
        setProperties(Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(console.error);
  }, []);

  const fetchMonthly = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ mode: "monthly", month: currentMonth });
      if (filterProperty) params.set("propertyId", filterProperty);
      const res = await fetch(`/api/admin/analytics?${params}`);
      const data = await res.json();
      setMonthlyData(data);

      const bRes = await fetch(`/api/admin/analytics?mode=property_breakdown&month=${currentMonth}`);
      const bData = await bRes.json();
      setPropertyBreakdown(bData.breakdown || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [currentMonth, filterProperty]);

  const fetchYearly = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ mode: "yearly", year: String(currentYear) });
      if (filterProperty) params.set("propertyId", filterProperty);
      const res = await fetch(`/api/admin/analytics?${params}`);
      const data = await res.json();
      setYearlyData(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [currentYear, filterProperty]);

  useEffect(() => {
    if (view === "monthly") fetchMonthly();
    else fetchYearly();
  }, [view, fetchMonthly, fetchYearly]);

  const profitColor = (v: number) => (v >= 0 ? "text-green-600" : "text-red-600");
  const profitBg = (v: number) => (v >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200");

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Keuangan</h1>
          <p className="text-sm text-gray-500 mt-1">
            Pemasukan, pengeluaran (OPEX), dan profit bersih
          </p>
        </div>
      </div>

      {/* View toggle + Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="bg-gray-100 rounded-lg p-1 flex">
          <button
            onClick={() => setView("monthly")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              view === "monthly" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            Bulanan
          </button>
          <button
            onClick={() => setView("yearly")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              view === "yearly" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
            }`}
          >
            Tahunan
          </button>
        </div>

        {view === "monthly" ? (
          <input
            type="month"
            value={currentMonth}
            onChange={(e) => setCurrentMonth(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2"
          />
        ) : (
          <select
            value={currentYear}
            onChange={(e) => setCurrentYear(parseInt(e.target.value))}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        )}

        <select
          value={filterProperty}
          onChange={(e) => setFilterProperty(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2"
        >
          <option value="">Semua Building</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : view === "monthly" && monthlyData ? (
        <MonthlyView
          data={monthlyData}
          propertyBreakdown={propertyBreakdown}
          profitColor={profitColor}
          profitBg={profitBg}
        />
      ) : view === "yearly" && yearlyData ? (
        <YearlyView
          data={yearlyData}
          profitColor={profitColor}
          profitBg={profitBg}
        />
      ) : (
        <div className="text-center py-10 text-gray-400">Tidak ada data</div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// MONTHLY VIEW
// ═══════════════════════════════════════════════════

function MonthlyView({
  data,
  propertyBreakdown,
  profitColor,
  profitBg,
}: {
  data: MonthlyData;
  propertyBreakdown: PropertyBreakdown[];
  profitColor: (v: number) => string;
  profitBg: (v: number) => string;
}) {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Pemasukan"
          value={formatCurrency(data.totalIncome)}
          subtitle={`${data.bookingCount} booking`}
          icon="💰"
          color="bg-green-50 border-green-200"
          valueColor="text-green-600"
        />
        <KPICard
          label="Total OPEX"
          value={formatCurrency(data.totalExpenses)}
          subtitle={`${data.expenseByCategory.reduce((s, c) => s + c.count, 0)} transaksi`}
          icon="📤"
          color="bg-red-50 border-red-200"
          valueColor="text-red-600"
        />
        <KPICard
          label="Profit Bersih"
          value={formatCurrency(data.netProfit)}
          subtitle={`Margin ${data.profitMargin}%`}
          icon={data.netProfit >= 0 ? "📈" : "📉"}
          color={profitBg(data.netProfit)}
          valueColor={profitColor(data.netProfit)}
        />
        <KPICard
          label="Profit Margin"
          value={`${data.profitMargin}%`}
          subtitle={data.netProfit >= 0 ? "Sehat" : "Rugi"}
          icon="🎯"
          color={profitBg(data.netProfit)}
          valueColor={profitColor(data.netProfit)}
        />
      </div>

      {/* Income vs Expense visual bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Pemasukan vs Pengeluaran</h3>
        <div className="space-y-4">
          <BarRow
            label="Pemasukan"
            amount={data.totalIncome}
            maxAmount={Math.max(data.totalIncome, data.totalExpenses)}
            color="bg-green-500"
          />
          <BarRow
            label="Pengeluaran (OPEX)"
            amount={data.totalExpenses}
            maxAmount={Math.max(data.totalIncome, data.totalExpenses)}
            color="bg-red-500"
          />
          <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">Profit Bersih</span>
            <span className={`text-lg font-bold ${profitColor(data.netProfit)}`}>
              {formatCurrency(data.netProfit)}
            </span>
          </div>
        </div>
      </div>

      {/* OPEX Breakdown by Category */}
      {data.expenseByCategory.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Rincian OPEX per Kategori</h3>
          <div className="space-y-3">
            {data.expenseByCategory.map((cat) => {
              const pct = data.totalExpenses > 0 ? (cat.total / data.totalExpenses) * 100 : 0;
              return (
                <div key={cat.id} className="flex items-center gap-3">
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                    style={{ backgroundColor: `${cat.color}20` }}
                  >
                    {cat.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700 truncate">{cat.name}</span>
                      <span className="text-gray-900 font-semibold ml-2 whitespace-nowrap">
                        {formatCurrency(cat.total)}
                      </span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 w-12 text-right shrink-0">
                    {pct.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Per-Property P&L */}
      {propertyBreakdown.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">P&amp;L per Building</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Building</th>
                  <th className="text-right px-4 py-3 font-medium text-green-600">Pemasukan</th>
                  <th className="text-right px-4 py-3 font-medium text-red-600">OPEX Langsung</th>
                  <th className="text-right px-4 py-3 font-medium text-orange-600">Biaya Umum</th>
                  <th className="text-right px-4 py-3 font-medium text-red-600">Total OPEX</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-700">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {propertyBreakdown.map((pb) => (
                  <tr key={pb.propertyId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{pb.propertyName}</td>
                    <td className="px-4 py-3 text-right text-green-600">{formatCurrency(pb.income)}</td>
                    <td className="px-4 py-3 text-right text-red-500">{formatCurrency(pb.directExpenses)}</td>
                    <td className="px-4 py-3 text-right text-orange-500">{formatCurrency(pb.generalExpenseShare)}</td>
                    <td className="px-4 py-3 text-right text-red-600 font-medium">{formatCurrency(pb.totalExpenses)}</td>
                    <td className={`px-4 py-3 text-right font-bold ${profitColor(pb.profit)}`}>
                      {formatCurrency(pb.profit)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-4 py-3">Total</td>
                  <td className="px-4 py-3 text-right text-green-600">
                    {formatCurrency(propertyBreakdown.reduce((s, p) => s + p.income, 0))}
                  </td>
                  <td className="px-4 py-3 text-right text-red-500">
                    {formatCurrency(propertyBreakdown.reduce((s, p) => s + p.directExpenses, 0))}
                  </td>
                  <td className="px-4 py-3 text-right text-orange-500">
                    {formatCurrency(propertyBreakdown.reduce((s, p) => s + p.generalExpenseShare, 0))}
                  </td>
                  <td className="px-4 py-3 text-right text-red-600">
                    {formatCurrency(propertyBreakdown.reduce((s, p) => s + p.totalExpenses, 0))}
                  </td>
                  <td className={`px-4 py-3 text-right ${profitColor(propertyBreakdown.reduce((s, p) => s + p.profit, 0))}`}>
                    {formatCurrency(propertyBreakdown.reduce((s, p) => s + p.profit, 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            * Biaya umum (tanpa building tertentu) dibagi rata ke semua building
          </p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// YEARLY VIEW
// ═══════════════════════════════════════════════════

function YearlyView({
  data,
  profitColor,
  profitBg,
}: {
  data: YearlyData;
  profitColor: (v: number) => string;
  profitBg: (v: number) => string;
}) {
  const maxMonthly = Math.max(
    ...data.months.map((m) => Math.max(m.income, m.expenses)),
    1
  );

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Pemasukan"
          value={formatCurrency(data.totalIncome)}
          subtitle={`Tahun ${data.year}`}
          icon="💰"
          color="bg-green-50 border-green-200"
          valueColor="text-green-600"
        />
        <KPICard
          label="Total OPEX"
          value={formatCurrency(data.totalExpenses)}
          subtitle={`Tahun ${data.year}`}
          icon="📤"
          color="bg-red-50 border-red-200"
          valueColor="text-red-600"
        />
        <KPICard
          label="Profit Bersih"
          value={formatCurrency(data.netProfit)}
          subtitle={`Margin ${data.profitMargin}%`}
          icon={data.netProfit >= 0 ? "📈" : "📉"}
          color={profitBg(data.netProfit)}
          valueColor={profitColor(data.netProfit)}
        />
        <KPICard
          label="Rata-rata/Bulan"
          value={formatCurrency(Math.round(data.netProfit / 12))}
          subtitle="Profit per bulan"
          icon="📅"
          color="bg-blue-50 border-blue-200"
          valueColor="text-blue-600"
        />
      </div>

      {/* Monthly chart (bar representation) */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-800 mb-5">Tren Bulanan {data.year}</h3>
        <div className="space-y-1">
          {data.months.map((m, idx) => (
            <div key={m.month} className="flex items-center gap-3">
              <span className="text-xs text-gray-500 w-8 shrink-0">{MONTH_NAMES[idx]}</span>
              <div className="flex-1 flex items-center gap-1">
                <div
                  className="h-4 bg-green-400 rounded-l transition-all relative group"
                  style={{ width: `${Math.max((m.income / maxMonthly) * 50, 0)}%` }}
                >
                  <span className="absolute hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded -top-8 left-0 whitespace-nowrap z-10">
                    Masuk: {formatCurrency(m.income)}
                  </span>
                </div>
                <div
                  className="h-4 bg-red-400 rounded-r transition-all relative group"
                  style={{ width: `${Math.max((m.expenses / maxMonthly) * 50, 0)}%` }}
                >
                  <span className="absolute hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded -top-8 left-0 whitespace-nowrap z-10">
                    Keluar: {formatCurrency(m.expenses)}
                  </span>
                </div>
              </div>
              <span className={`text-xs font-semibold w-20 text-right shrink-0 ${profitColor(m.profit)}`}>
                {formatCompact(m.profit)}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-6 mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-400" /> Pemasukan
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-400" /> Pengeluaran
          </div>
        </div>
      </div>

      {/* Monthly P&L table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Detail per Bulan</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Bulan</th>
                <th className="text-right px-4 py-3 font-medium text-green-600">Pemasukan</th>
                <th className="text-right px-4 py-3 font-medium text-red-600">OPEX</th>
                <th className="text-right px-4 py-3 font-medium text-gray-700">Profit</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.months.map((m, idx) => {
                const margin = m.income > 0 ? ((m.profit / m.income) * 100).toFixed(1) : "-";
                return (
                  <tr key={m.month} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{MONTH_NAMES[idx]} {data.year}</td>
                    <td className="px-4 py-3 text-right text-green-600">{formatCurrency(m.income)}</td>
                    <td className="px-4 py-3 text-right text-red-500">{formatCurrency(m.expenses)}</td>
                    <td className={`px-4 py-3 text-right font-bold ${profitColor(m.profit)}`}>
                      {formatCurrency(m.profit)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {margin === "-" ? "-" : `${margin}%`}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-gray-50 font-semibold">
                <td className="px-4 py-3">Total {data.year}</td>
                <td className="px-4 py-3 text-right text-green-600">{formatCurrency(data.totalIncome)}</td>
                <td className="px-4 py-3 text-right text-red-600">{formatCurrency(data.totalExpenses)}</td>
                <td className={`px-4 py-3 text-right ${profitColor(data.netProfit)}`}>
                  {formatCurrency(data.netProfit)}
                </td>
                <td className="px-4 py-3 text-right text-gray-500">{data.profitMargin}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* OPEX Breakdown by Category (yearly) */}
      {data.expenseByCategory.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Rincian OPEX Tahunan per Kategori</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.expenseByCategory.map((cat) => {
              const pct = data.totalExpenses > 0 ? (cat.total / data.totalExpenses) * 100 : 0;
              return (
                <div key={cat.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                  <span
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                    style={{ backgroundColor: `${cat.color}20` }}
                  >
                    {cat.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{cat.name}</p>
                    <p className="text-xs text-gray-400">{cat.count} transaksi · {pct.toFixed(1)}%</p>
                  </div>
                  <span className="text-sm font-bold text-gray-900 whitespace-nowrap">
                    {formatCurrency(cat.total)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════

function KPICard({
  label,
  value,
  subtitle,
  icon,
  color,
  valueColor,
}: {
  label: string;
  value: string;
  subtitle: string;
  icon: string;
  color: string;
  valueColor: string;
}) {
  return (
    <div className={`rounded-xl border p-5 ${color}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-600">{label}</p>
        <span className="text-xl">{icon}</span>
      </div>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}

function BarRow({
  label,
  amount,
  maxAmount,
  color,
}: {
  label: string;
  amount: number;
  maxAmount: number;
  color: string;
}) {
  const pct = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="font-semibold text-gray-900">{formatCurrency(amount)}</span>
      </div>
      <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
