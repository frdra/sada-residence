"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface PropertyInfo {
  id: string;
  name: string;
}

interface ExpenseRecord {
  id: string;
  category_id: string;
  property_id: string | null;
  title: string;
  description: string | null;
  amount: number;
  expense_date: string;
  payment_method: string;
  receipt_url: string | null;
  is_recurring: boolean;
  recurring_interval: string | null;
  recurring_day: number | null;
  parent_expense_id: string | null;
  status: string;
  notes: string | null;
  category?: Category;
  property?: PropertyInfo;
}

interface SummaryData {
  month: string;
  grandTotal: number;
  byCategory: { id: string; name: string; icon: string; color: string; total: number; count: number }[];
  transactionCount: number;
}

const formatPrice = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  transfer: "Transfer",
  qris: "QRIS",
};

export default function ExpensesPage() {
  const [tab, setTab] = useState<"list" | "summary" | "recurring">("list");
  const [categories, setCategories] = useState<Category[]>([]);
  const [properties, setProperties] = useState<PropertyInfo[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [expenseCount, setExpenseCount] = useState(0);
  const [recurring, setRecurring] = useState<ExpenseRecord[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filters
  const [filterProperty, setFilterProperty] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterMonth, setFilterMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);

  // Create/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [form, setForm] = useState({
    categoryId: "",
    propertyId: "",
    title: "",
    description: "",
    amount: "",
    expenseDate: new Date().toISOString().split("T")[0],
    paymentMethod: "cash",
    isRecurring: false,
    recurringInterval: "monthly",
    recurringDay: String(new Date().getDate()),
    notes: "",
  });

  // Receipt upload
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState<string | null>(null);

  // Receipt preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // ── Fetch helpers ──

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/admin/expenses?mode=categories");
    const data = await res.json();
    setCategories(data.categories || []);
  }, []);

  const fetchProperties = useCallback(async () => {
    const res = await fetch("/api/admin/rates?mode=all");
    const data = await res.json();
    const propMap = new Map<string, PropertyInfo>();
    data.rooms?.forEach((r: any) => {
      if (r.property) propMap.set(r.property.id, r.property);
    });
    setProperties(Array.from(propMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
  }, []);

  const fetchExpenses = useCallback(async () => {
    const startDate = `${filterMonth}-01`;
    const [y, m] = filterMonth.split("-").map(Number);
    const endDate = new Date(y, m, 0).toISOString().split("T")[0];

    const params = new URLSearchParams({
      page: String(page),
      limit: "30",
      startDate,
      endDate,
    });
    if (filterProperty !== "all") params.set("propertyId", filterProperty);
    if (filterCategory !== "all") params.set("categoryId", filterCategory);
    if (searchText) params.set("search", searchText);

    const res = await fetch(`/api/admin/expenses?${params}`);
    const data = await res.json();
    setExpenses(data.expenses || []);
    setExpenseCount(data.count || 0);
  }, [filterMonth, filterProperty, filterCategory, searchText, page]);

  const fetchSummary = useCallback(async () => {
    const params = new URLSearchParams({ mode: "summary", month: filterMonth });
    if (filterProperty !== "all") params.set("propertyId", filterProperty);
    const res = await fetch(`/api/admin/expenses?${params}`);
    const data = await res.json();
    setSummary(data);
  }, [filterMonth, filterProperty]);

  const fetchRecurring = useCallback(async () => {
    const res = await fetch("/api/admin/expenses?mode=recurring");
    const data = await res.json();
    setRecurring(data.recurring || []);
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchCategories(), fetchProperties()]);
      setLoading(false);
    };
    init();
  }, [fetchCategories, fetchProperties]);

  useEffect(() => {
    if (tab === "list") fetchExpenses();
    if (tab === "summary") fetchSummary();
    if (tab === "recurring") fetchRecurring();
  }, [tab, fetchExpenses, fetchSummary, fetchRecurring]);

  // ── Create / Edit ──

  const openCreateModal = () => {
    setEditingExpense(null);
    setForm({
      categoryId: categories[0]?.id || "",
      propertyId: "",
      title: "",
      description: "",
      amount: "",
      expenseDate: new Date().toISOString().split("T")[0],
      paymentMethod: "cash",
      isRecurring: false,
      recurringInterval: "monthly",
      recurringDay: String(new Date().getDate()),
      notes: "",
    });
    setShowModal(true);
  };

  const openEditModal = (exp: ExpenseRecord) => {
    setEditingExpense(exp);
    setForm({
      categoryId: exp.category_id,
      propertyId: exp.property_id || "",
      title: exp.title,
      description: exp.description || "",
      amount: String(exp.amount),
      expenseDate: exp.expense_date,
      paymentMethod: exp.payment_method,
      isRecurring: exp.is_recurring,
      recurringInterval: exp.recurring_interval || "monthly",
      recurringDay: String(exp.recurring_day || new Date().getDate()),
      notes: exp.notes || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.categoryId || !form.title || !form.amount) {
      showMessage("error", "Kategori, judul, dan nominal wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        action: editingExpense ? "update" : "create",
        categoryId: form.categoryId,
        propertyId: form.propertyId || null,
        title: form.title,
        description: form.description || null,
        amount: form.amount,
        expenseDate: form.expenseDate,
        paymentMethod: form.paymentMethod,
        notes: form.notes || null,
      };

      if (editingExpense) {
        payload.id = editingExpense.id;
      } else {
        payload.isRecurring = form.isRecurring;
        if (form.isRecurring) {
          payload.recurringInterval = form.recurringInterval;
          payload.recurringDay = parseInt(form.recurringDay);
        }
      }

      const res = await fetch("/api/admin/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      showMessage("success", editingExpense ? "Pengeluaran berhasil diperbarui" : "Pengeluaran berhasil dicatat");
      setShowModal(false);
      fetchExpenses();
      if (tab === "summary") fetchSummary();
      if (tab === "recurring") fetchRecurring();
    } catch (err: any) {
      showMessage("error", err.message);
    }
    setSaving(false);
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Batalkan pengeluaran ini?")) return;
    try {
      const res = await fetch("/api/admin/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", id }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      showMessage("success", "Pengeluaran dibatalkan");
      fetchExpenses();
      if (tab === "summary") fetchSummary();
    } catch (err: any) {
      showMessage("error", err.message);
    }
  };

  // ── Receipt upload ──

  const handleUploadReceipt = async (expenseId: string, file: File) => {
    setUploadingReceipt(expenseId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("expenseId", expenseId);

      const res = await fetch("/api/admin/expenses", { method: "POST", body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      showMessage("success", "Bukti pembayaran berhasil diupload");
      fetchExpenses();
    } catch (err: any) {
      showMessage("error", err.message);
    }
    setUploadingReceipt(null);
  };

  // ── Generate recurring ──

  const handleGenerateRecurring = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_recurring", month: filterMonth }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.count === 0) {
        showMessage("error", "Semua pengeluaran berulang sudah di-generate untuk bulan ini");
      } else {
        showMessage("success", `${data.count} pengeluaran berulang berhasil di-generate`);
      }
      fetchExpenses();
      fetchSummary();
    } catch (err: any) {
      showMessage("error", err.message);
    }
    setSaving(false);
  };

  const totalPages = Math.ceil(expenseCount / 30);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-terracotta-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-charcoal-800">Pengeluaran</h1>
          <p className="text-sm text-concrete-600 mt-1">Catat dan kelola semua pengeluaran operasional</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGenerateRecurring}
            disabled={saving}
            className="bg-amber-500 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors"
          >
            🔄 Generate Recurring
          </button>
          <button
            onClick={openCreateModal}
            className="bg-terracotta-500 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-terracotta-600 transition-colors"
          >
            + Catat Pengeluaran
          </button>
        </div>
      </div>

      {/* Toast */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
          message.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
        }`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-concrete-200">
        <div className="flex gap-0">
          {[
            { key: "list" as const, label: "Daftar", icon: "📋" },
            { key: "summary" as const, label: "Ringkasan", icon: "📊" },
            { key: "recurring" as const, label: "Berulang", icon: "🔄" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key ? "border-terracotta-500 text-terracotta-500" : "border-transparent text-concrete-600 hover:text-charcoal-800"
              }`}
            >
              <span className="mr-1.5">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <input
          type="month"
          value={filterMonth}
          onChange={(e) => { setFilterMonth(e.target.value); setPage(1); }}
          className="text-sm border border-concrete-300 rounded-lg px-3 py-2"
        />
        <select
          value={filterProperty}
          onChange={(e) => { setFilterProperty(e.target.value); setPage(1); }}
          className="text-sm border border-concrete-300 rounded-lg px-3 py-2"
        >
          <option value="all">Semua Building</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {tab === "list" && (
          <>
            <select
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
              className="text-sm border border-concrete-300 rounded-lg px-3 py-2"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Cari judul..."
              value={searchText}
              onChange={(e) => { setSearchText(e.target.value); setPage(1); }}
              className="text-sm border border-concrete-300 rounded-lg px-3 py-2 w-48"
            />
          </>
        )}
      </div>

      {/* ═══════════════ TAB: Daftar ═══════════════ */}
      {tab === "list" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-concrete-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-concrete-100 border-b">
                    <th className="text-left px-4 py-3 font-medium text-charcoal-600">Tanggal</th>
                    <th className="text-left px-4 py-3 font-medium text-charcoal-600">Kategori</th>
                    <th className="text-left px-4 py-3 font-medium text-charcoal-600">Judul</th>
                    <th className="text-left px-4 py-3 font-medium text-charcoal-600">Building</th>
                    <th className="text-right px-4 py-3 font-medium text-charcoal-600">Nominal</th>
                    <th className="text-center px-4 py-3 font-medium text-charcoal-600">Metode</th>
                    <th className="text-center px-4 py-3 font-medium text-charcoal-600">Bukti</th>
                    <th className="text-center px-4 py-3 font-medium text-charcoal-600">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {expenses.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-concrete-600">
                        Belum ada pengeluaran bulan ini
                      </td>
                    </tr>
                  )}
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-concrete-100">
                      <td className="px-4 py-3 text-charcoal-600 whitespace-nowrap">
                        {formatDate(exp.expense_date)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium"
                          style={{ backgroundColor: `${exp.category?.color}20`, color: exp.category?.color }}
                        >
                          {exp.category?.icon} {exp.category?.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-charcoal-800">{exp.title}</div>
                        {exp.description && (
                          <div className="text-xs text-concrete-600 mt-0.5">{exp.description}</div>
                        )}
                        {exp.parent_expense_id && (
                          <span className="text-xs text-amber-600 font-medium">🔄 Auto-generated</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-charcoal-600">
                        {exp.property?.name || <span className="text-concrete-600">Umum</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-charcoal-800">
                        {formatPrice(exp.amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs text-concrete-600">{PAYMENT_LABELS[exp.payment_method] || exp.payment_method}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {exp.receipt_url ? (
                          <button
                            onClick={() => setPreviewUrl(exp.receipt_url)}
                            className="text-terracotta-500 hover:text-terracotta-700 text-xs font-medium"
                          >
                            📎 Lihat
                          </button>
                        ) : (
                          <label className="text-concrete-600 hover:text-terracotta-500 text-xs cursor-pointer">
                            {uploadingReceipt === exp.id ? "⏳" : "📤 Upload"}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUploadReceipt(exp.id, file);
                              }}
                            />
                          </label>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditModal(exp)}
                            className="text-terracotta-500 hover:text-terracotta-700 text-xs font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleCancel(exp.id)}
                            className="text-red-500 hover:text-red-700 text-xs font-medium"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <span className="text-xs text-concrete-600">{expenseCount} pengeluaran</span>
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i + 1)}
                      className={`px-3 py-1 text-xs rounded ${
                        page === i + 1 ? "bg-terracotta-500 text-white" : "bg-concrete-100 text-charcoal-600 hover:bg-gray-200"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════ TAB: Ringkasan ═══════════════ */}
      {tab === "summary" && summary && (
        <div className="space-y-6">
          {/* Grand total card */}
          <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-6 text-white">
            <p className="text-sm opacity-90">Total Pengeluaran</p>
            <p className="text-3xl font-bold mt-1">{formatPrice(summary.grandTotal)}</p>
            <p className="text-sm opacity-75 mt-2">
              {summary.transactionCount} transaksi di bulan {filterMonth}
            </p>
          </div>

          {/* By category */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {summary.byCategory
              .sort((a, b) => b.total - a.total)
              .map((cat) => {
                const pct = summary.grandTotal > 0 ? (cat.total / summary.grandTotal) * 100 : 0;
                return (
                  <div key={cat.id} className="bg-white rounded-xl border border-concrete-200 p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <span
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                        style={{ backgroundColor: `${cat.color}20` }}
                      >
                        {cat.icon}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-charcoal-800">{cat.name}</p>
                        <p className="text-xs text-concrete-600">{cat.count} transaksi</p>
                      </div>
                    </div>
                    <p className="text-lg font-bold text-charcoal-800">{formatPrice(cat.total)}</p>
                    <div className="mt-2 bg-concrete-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: cat.color }}
                      />
                    </div>
                    <p className="text-xs text-concrete-600 mt-1">{pct.toFixed(1)}% dari total</p>
                  </div>
                );
              })}
          </div>

          {summary.byCategory.length === 0 && (
            <div className="text-center py-10 text-concrete-600">
              Belum ada pengeluaran bulan ini
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ TAB: Berulang ═══════════════ */}
      {tab === "recurring" && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
            Pengeluaran berulang adalah template. Klik &quot;Generate Recurring&quot; untuk otomatis
            membuat entri pengeluaran di bulan yang dipilih. Jika sudah di-generate, tidak akan dibuat duplikat.
          </div>

          {recurring.length === 0 ? (
            <div className="text-center py-10 text-concrete-600">
              Belum ada pengeluaran berulang. Buat pengeluaran baru dan aktifkan opsi &quot;Berulang&quot;.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recurring.map((r) => (
                <div key={r.id} className="bg-white rounded-xl border border-concrete-200 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                      style={{ backgroundColor: `${r.category?.color}20` }}
                    >
                      {r.category?.icon}
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-charcoal-800">{r.title}</p>
                      <p className="text-xs text-concrete-600">
                        {r.category?.name} · {r.property?.name || "Umum"}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-charcoal-800">{formatPrice(r.amount)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-concrete-600">
                    <span>🔄 {r.recurring_interval === "monthly" ? "Bulanan" : r.recurring_interval === "weekly" ? "Mingguan" : r.recurring_interval === "quarterly" ? "Triwulan" : "Tahunan"}</span>
                    <span>📅 Tgl {r.recurring_day}</span>
                    <span>💳 {PAYMENT_LABELS[r.payment_method] || r.payment_method}</span>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => openEditModal(r)}
                      className="text-terracotta-500 hover:text-terracotta-700 text-xs font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleCancel(r.id)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium"
                    >
                      Nonaktifkan
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ Create/Edit Modal ═══════════════ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-charcoal-800">
                {editingExpense ? "Edit Pengeluaran" : "Catat Pengeluaran Baru"}
              </h3>

              {/* Category */}
              <div>
                <label className="text-sm font-medium text-charcoal-800 block mb-1.5">Kategori</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full border border-concrete-300 rounded-lg px-3 py-2.5 text-sm"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>

              {/* Property */}
              <div>
                <label className="text-sm font-medium text-charcoal-800 block mb-1.5">Building</label>
                <select
                  value={form.propertyId}
                  onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
                  className="w-full border border-concrete-300 rounded-lg px-3 py-2.5 text-sm"
                >
                  <option value="">Umum (semua building)</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="text-sm font-medium text-charcoal-800 block mb-1.5">Judul</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border border-concrete-300 rounded-lg px-3 py-2.5 text-sm"
                  placeholder="Contoh: Bayar listrik Persada Feb 2026"
                />
              </div>

              {/* Amount + Date row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-charcoal-800 block mb-1.5">Nominal (IDR)</label>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full border border-concrete-300 rounded-lg px-3 py-2.5 text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-charcoal-800 block mb-1.5">Tanggal</label>
                  <input
                    type="date"
                    value={form.expenseDate}
                    onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                    className="w-full border border-concrete-300 rounded-lg px-3 py-2.5 text-sm"
                  />
                </div>
              </div>

              {/* Payment method */}
              <div>
                <label className="text-sm font-medium text-charcoal-800 block mb-1.5">Metode Pembayaran</label>
                <div className="flex gap-2">
                  {[
                    { val: "cash", label: "💵 Cash" },
                    { val: "transfer", label: "🏦 Transfer" },
                    { val: "qris", label: "📱 QRIS" },
                  ].map((pm) => (
                    <button
                      key={pm.val}
                      type="button"
                      onClick={() => setForm({ ...form, paymentMethod: pm.val })}
                      className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                        form.paymentMethod === pm.val
                          ? "border-terracotta-500 bg-terracotta-50 text-terracotta-600 font-medium"
                          : "border-concrete-200 text-charcoal-600 hover:bg-concrete-100"
                      }`}
                    >
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-charcoal-800 block mb-1.5">Keterangan (opsional)</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-concrete-300 rounded-lg px-3 py-2.5 text-sm"
                  rows={2}
                  placeholder="Detail tambahan..."
                />
              </div>

              {/* Recurring toggle (only for new) */}
              {!editingExpense && (
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={form.isRecurring}
                      onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })}
                      className="w-4 h-4 rounded border-concrete-300 text-terracotta-500 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-charcoal-800">
                      🔄 Pengeluaran berulang
                    </span>
                  </label>

                  {form.isRecurring && (
                    <div className="grid grid-cols-2 gap-3 pl-7">
                      <div>
                        <label className="text-xs text-concrete-600 block mb-1">Interval</label>
                        <select
                          value={form.recurringInterval}
                          onChange={(e) => setForm({ ...form, recurringInterval: e.target.value })}
                          className="w-full border border-concrete-300 rounded-lg px-3 py-2 text-sm"
                        >
                          <option value="weekly">Mingguan</option>
                          <option value="monthly">Bulanan</option>
                          <option value="quarterly">Triwulan</option>
                          <option value="yearly">Tahunan</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-concrete-600 block mb-1">Tanggal/Hari ke-</label>
                        <input
                          type="number"
                          min={1}
                          max={31}
                          value={form.recurringDay}
                          onChange={(e) => setForm({ ...form, recurringDay: e.target.value })}
                          className="w-full border border-concrete-300 rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex-1 bg-terracotta-500 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-terracotta-600 disabled:opacity-50 transition-colors"
                >
                  {saving ? "Menyimpan..." : editingExpense ? "Simpan Perubahan" : "Catat Pengeluaran"}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-concrete-100 text-charcoal-800 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt preview modal */}
      {previewUrl && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
          <div className="bg-white rounded-xl p-2 max-w-lg max-h-[80vh] overflow-auto">
            <img src={previewUrl} alt="Bukti pembayaran" className="w-full rounded-lg" />
          </div>
        </div>
      )}

      {/* Hidden file input for receipt */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" />
    </div>
  );
}
