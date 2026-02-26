"use client";

import { useState, useEffect, useCallback } from "react";

type StayType = "daily" | "weekly" | "monthly";

interface PropertyInfo {
  id: string;
  name: string;
}

interface RoomInfo {
  id: string;
  room_number: string;
  floor: number;
  status: string;
  property_id: string;
  room_type_id: string;
  property?: PropertyInfo;
}

interface RateRecord {
  id: string;
  room_type_id: string;
  property_id: string | null;
  stay_type: StayType;
  price: number;
  deposit_percentage: number;
  tax_percentage: number;
  service_fee: number;
  is_active: boolean;
  room_type?: { id: string; name: string };
  property?: PropertyInfo;
}

interface OverrideRecord {
  id: string;
  room_id: string;
  stay_type: StayType;
  price: number;
  is_active: boolean;
  notes: string | null;
  room?: {
    id: string;
    room_number: string;
    property_id: string;
    status: string;
    property?: PropertyInfo;
  };
}

const STAY_LABELS: Record<StayType, string> = {
  daily: "Harian",
  weekly: "Mingguan",
  monthly: "Bulanan",
};

const formatPrice = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

export default function PricingPage() {
  const [tab, setTab] = useState<"building" | "room" | "empty">("building");
  const [rates, setRates] = useState<RateRecord[]>([]);
  const [overrides, setOverrides] = useState<OverrideRecord[]>([]);
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [properties, setProperties] = useState<PropertyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Building tab state
  const [selectedProperty, setSelectedProperty] = useState<string>("all");

  // Room tab state
  const [roomProperty, setRoomProperty] = useState<string>("all");
  const [roomSearch, setRoomSearch] = useState("");
  const [editingOverride, setEditingOverride] = useState<{
    roomId: string;
    roomNumber: string;
    stayType: StayType;
    price: string;
    notes: string;
  } | null>(null);

  // Empty rooms tab state
  const [emptyProperty, setEmptyProperty] = useState<string>("");
  const [emptyStayType, setEmptyStayType] = useState<StayType>("monthly");
  const [emptyPrice, setEmptyPrice] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/rates?mode=all");
      const data = await res.json();
      setRates(data.rates || []);
      setOverrides(data.overrides || []);
      setRooms(data.rooms || []);

      // Extract unique properties
      const propMap = new Map<string, PropertyInfo>();
      data.rooms?.forEach((r: RoomInfo) => {
        if (r.property) propMap.set(r.property.id, r.property);
      });
      data.rates?.forEach((r: RateRecord) => {
        if (r.property) propMap.set(r.property.id, r.property);
      });
      const props = Array.from(propMap.values()).sort((a, b) => a.name.localeCompare(b.name));
      setProperties(props);
      if (props.length > 0 && !emptyProperty) {
        setEmptyProperty(props[0].id);
      }
    } catch {
      setMessage({ type: "error", text: "Gagal memuat data harga" });
    }
    setLoading(false);
  }, [emptyProperty]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // ── Building Rate Helpers ──

  const getRate = (propertyId: string | null, stayType: StayType): RateRecord | undefined => {
    return rates.find(
      (r) =>
        r.stay_type === stayType &&
        (propertyId ? r.property_id === propertyId : r.property_id === null)
    );
  };

  const globalRate = (stayType: StayType) => getRate(null, stayType);

  const handleSaveRate = async (
    propertyId: string | null,
    stayType: StayType,
    price: string,
    roomTypeId: string
  ) => {
    if (!price || isNaN(Number(price))) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert_rate",
          roomTypeId,
          stayType,
          propertyId: propertyId || undefined,
          price,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      showMessage("success", `Harga ${STAY_LABELS[stayType]} berhasil disimpan`);
      fetchData();
    } catch (err: any) {
      showMessage("error", err.message);
    }
    setSaving(false);
  };

  const handleBulkPropertyRates = async (
    propertyId: string,
    roomTypeId: string,
    ratesList: { stayType: StayType; price: string }[]
  ) => {
    const validRates = ratesList.filter((r) => r.price && !isNaN(Number(r.price)));
    if (!validRates.length) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk_property_rates",
          propertyId,
          roomTypeId,
          rates: validRates,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      showMessage("success", `${data.count} harga berhasil diperbarui`);
      fetchData();
    } catch (err: any) {
      showMessage("error", err.message);
    }
    setSaving(false);
  };

  // ── Room Override Helpers ──

  const handleSaveOverride = async () => {
    if (!editingOverride || !editingOverride.price) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_room_override",
          roomId: editingOverride.roomId,
          stayType: editingOverride.stayType,
          price: editingOverride.price,
          notes: editingOverride.notes,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      showMessage("success", `Override kamar ${editingOverride.roomNumber} berhasil disimpan`);
      setEditingOverride(null);
      fetchData();
    } catch (err: any) {
      showMessage("error", err.message);
    }
    setSaving(false);
  };

  const handleDeleteOverride = async (overrideId: string) => {
    if (!confirm("Hapus override harga ini?")) return;
    try {
      const res = await fetch("/api/admin/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_override", overrideId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      showMessage("success", "Override berhasil dihapus");
      fetchData();
    } catch (err: any) {
      showMessage("error", err.message);
    }
  };

  // ── Empty Rooms Bulk ──

  const handleBulkEmptyRooms = async () => {
    if (!emptyProperty || !emptyPrice || !emptyStayType) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "bulk_empty_rooms",
          propertyId: emptyProperty,
          stayType: emptyStayType,
          price: emptyPrice,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.count === 0) {
        showMessage("error", "Tidak ada kamar kosong di properti ini");
      } else {
        showMessage(
          "success",
          `Harga ${data.count} kamar kosong berhasil diset: ${data.roomNumbers?.join(", ")}`
        );
      }
      setEmptyPrice("");
      fetchData();
    } catch (err: any) {
      showMessage("error", err.message);
    }
    setSaving(false);
  };

  // ── Derived Data ──

  const roomTypeId = rates.length > 0 ? rates[0].room_type_id : "";

  const filteredRooms = rooms.filter((r) => {
    if (roomProperty !== "all" && r.property_id !== roomProperty) return false;
    if (roomSearch && !r.room_number.toLowerCase().includes(roomSearch.toLowerCase())) return false;
    return true;
  });

  const getRoomOverride = (roomId: string, stayType: StayType) =>
    overrides.find((o) => o.room_id === roomId && o.stay_type === stayType);

  const getEffectivePrice = (room: RoomInfo, stayType: StayType): { price: number; source: string } => {
    // 1. Room override
    const override = getRoomOverride(room.id, stayType);
    if (override) return { price: override.price, source: "override" };
    // 2. Property rate
    const propRate = getRate(room.property_id, stayType);
    if (propRate) return { price: propRate.price, source: "property" };
    // 3. Global rate
    const global = globalRate(stayType);
    if (global) return { price: global.price, source: "global" };
    return { price: 0, source: "none" };
  };

  const emptyRoomCount = emptyProperty
    ? rooms.filter((r) => r.property_id === emptyProperty && r.status === "available").length
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Harga</h1>
          <p className="text-sm text-gray-500 mt-1">
            Atur harga per building, per kamar, atau bulk kamar kosong
          </p>
        </div>
      </div>

      {/* Toast */}
      {message && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
            message.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-0">
          {[
            { key: "building" as const, label: "Per Building", icon: "🏢" },
            { key: "room" as const, label: "Per Kamar", icon: "🚪" },
            { key: "empty" as const, label: "Kamar Kosong", icon: "📦" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <span className="mr-1.5">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════ TAB: Per Building ═══════════════ */}
      {tab === "building" && (
        <div className="space-y-6">
          {/* Global Rates */}
          <RateCard
            title="Harga Global (Default)"
            subtitle="Berlaku untuk semua building kecuali ada harga khusus"
            icon="🌍"
            rates={rates}
            propertyId={null}
            roomTypeId={roomTypeId}
            onSave={handleSaveRate}
            saving={saving}
          />

          {/* Per-Property Rates */}
          <div className="flex items-center gap-3 pt-2">
            <h3 className="text-lg font-semibold text-gray-800">Harga Per Building</h3>
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
            >
              <option value="all">Semua Building</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {properties
            .filter((p) => selectedProperty === "all" || p.id === selectedProperty)
            .map((property) => {
              const roomCount = rooms.filter((r) => r.property_id === property.id).length;
              return (
                <RateCard
                  key={property.id}
                  title={property.name}
                  subtitle={`${roomCount} kamar`}
                  icon="🏠"
                  rates={rates}
                  propertyId={property.id}
                  roomTypeId={roomTypeId}
                  onSave={handleSaveRate}
                  onBulkSave={(ratesList) =>
                    handleBulkPropertyRates(property.id, roomTypeId, ratesList)
                  }
                  saving={saving}
                  globalRates={{
                    daily: globalRate("daily")?.price,
                    weekly: globalRate("weekly")?.price,
                    monthly: globalRate("monthly")?.price,
                  }}
                />
              );
            })}
        </div>
      )}

      {/* ═══════════════ TAB: Per Kamar ═══════════════ */}
      {tab === "room" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <select
              value={roomProperty}
              onChange={(e) => setRoomProperty(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="all">Semua Building</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Cari no. kamar..."
              value={roomSearch}
              onChange={(e) => setRoomSearch(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 w-48"
            />
            <span className="text-sm text-gray-500 self-center">
              {filteredRooms.length} kamar
            </span>
          </div>

          {/* Override edit modal */}
          {editingOverride && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
                <h3 className="text-lg font-semibold">
                  Override Harga Kamar {editingOverride.roomNumber}
                </h3>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Tipe Sewa</label>
                  <select
                    value={editingOverride.stayType}
                    onChange={(e) =>
                      setEditingOverride({ ...editingOverride, stayType: e.target.value as StayType })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="daily">Harian</option>
                    <option value="weekly">Mingguan</option>
                    <option value="monthly">Bulanan</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Harga (IDR)</label>
                  <input
                    type="number"
                    value={editingOverride.price}
                    onChange={(e) =>
                      setEditingOverride({ ...editingOverride, price: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Catatan (opsional)</label>
                  <input
                    type="text"
                    value={editingOverride.notes}
                    onChange={(e) =>
                      setEditingOverride({ ...editingOverride, notes: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Alasan harga khusus..."
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleSaveOverride}
                    disabled={saving}
                    className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? "Menyimpan..." : "Simpan"}
                  </button>
                  <button
                    onClick={() => setEditingOverride(null)}
                    className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-200"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Room pricing table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Kamar</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Building</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Harian</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Mingguan</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Bulanan</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRooms.map((room) => {
                    const daily = getEffectivePrice(room, "daily");
                    const weekly = getEffectivePrice(room, "weekly");
                    const monthly = getEffectivePrice(room, "monthly");

                    return (
                      <tr key={room.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{room.room_number}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {room.property?.name || "-"}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={room.status} />
                        </td>
                        <PriceCell data={daily} />
                        <PriceCell data={weekly} />
                        <PriceCell data={monthly} />
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() =>
                              setEditingOverride({
                                roomId: room.id,
                                roomNumber: room.room_number,
                                stayType: "monthly",
                                price: "",
                                notes: "",
                              })
                            }
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            Set Harga
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active overrides */}
          {overrides.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-800 mb-3">
                Override Aktif ({overrides.length})
              </h3>
              <div className="space-y-2">
                {overrides.map((ov) => (
                  <div
                    key={ov.id}
                    className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5"
                  >
                    <div className="text-sm">
                      <span className="font-medium">
                        Kamar {ov.room?.room_number}
                      </span>
                      <span className="text-gray-500 ml-2">
                        {ov.room?.property?.name}
                      </span>
                      <span className="text-gray-400 mx-2">·</span>
                      <span>{STAY_LABELS[ov.stay_type]}</span>
                      <span className="text-gray-400 mx-2">·</span>
                      <span className="font-semibold text-amber-700">
                        {formatPrice(ov.price)}
                      </span>
                      {ov.notes && (
                        <span className="text-gray-400 ml-2 text-xs">
                          ({ov.notes})
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteOverride(ov.id)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium ml-4"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════ TAB: Kamar Kosong ═══════════════ */}
      {tab === "empty" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                Set Harga Bulk Kamar Kosong
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Atur harga khusus untuk semua kamar kosong (status &quot;Available&quot;) di
                suatu building sekaligus
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                  Pilih Building
                </label>
                <select
                  value={emptyProperty}
                  onChange={(e) => setEmptyProperty(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">
                  Tipe Sewa
                </label>
                <select
                  value={emptyStayType}
                  onChange={(e) => setEmptyStayType(e.target.value as StayType)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                >
                  <option value="daily">Harian</option>
                  <option value="weekly">Mingguan</option>
                  <option value="monthly">Bulanan</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">
                Harga Baru (IDR)
              </label>
              <input
                type="number"
                value={emptyPrice}
                onChange={(e) => setEmptyPrice(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
                placeholder="Contoh: 3500000"
              />
            </div>

            {/* Preview */}
            {emptyProperty && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <span className="font-semibold">{emptyRoomCount} kamar kosong</span>{" "}
                  ditemukan di{" "}
                  <span className="font-semibold">
                    {properties.find((p) => p.id === emptyProperty)?.name}
                  </span>
                  . Harga {STAY_LABELS[emptyStayType]} akan di-set ke{" "}
                  <span className="font-semibold">
                    {emptyPrice ? formatPrice(Number(emptyPrice)) : "-"}
                  </span>{" "}
                  untuk setiap kamar kosong.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {rooms
                    .filter(
                      (r) =>
                        r.property_id === emptyProperty && r.status === "available"
                    )
                    .map((r) => (
                      <span
                        key={r.id}
                        className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded"
                      >
                        {r.room_number}
                      </span>
                    ))}
                </div>
              </div>
            )}

            <button
              onClick={handleBulkEmptyRooms}
              disabled={saving || !emptyPrice || !emptyProperty || emptyRoomCount === 0}
              className="bg-blue-600 text-white rounded-lg px-6 py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving
                ? "Menyimpan..."
                : `Set Harga ${emptyRoomCount} Kamar Kosong`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──

function RateCard({
  title,
  subtitle,
  icon,
  rates,
  propertyId,
  roomTypeId,
  onSave,
  onBulkSave,
  saving,
  globalRates,
}: {
  title: string;
  subtitle: string;
  icon: string;
  rates: RateRecord[];
  propertyId: string | null;
  roomTypeId: string;
  onSave: (propertyId: string | null, stayType: StayType, price: string, roomTypeId: string) => void;
  onBulkSave?: (ratesList: { stayType: StayType; price: string }[]) => void;
  saving: boolean;
  globalRates?: { daily?: number; weekly?: number; monthly?: number };
}) {
  const stayTypes: StayType[] = ["daily", "weekly", "monthly"];

  const getExistingPrice = (stayType: StayType): string => {
    const rate = rates.find(
      (r) =>
        r.stay_type === stayType &&
        (propertyId ? r.property_id === propertyId : r.property_id === null)
    );
    return rate ? String(rate.price) : "";
  };

  const [prices, setPrices] = useState<Record<StayType, string>>({
    daily: getExistingPrice("daily"),
    weekly: getExistingPrice("weekly"),
    monthly: getExistingPrice("monthly"),
  });

  // Sync when rates change
  useEffect(() => {
    setPrices({
      daily: getExistingPrice("daily"),
      weekly: getExistingPrice("weekly"),
      monthly: getExistingPrice("monthly"),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rates]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{icon}</span>
        <div>
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stayTypes.map((st) => (
          <div key={st} className="space-y-1.5">
            <label className="text-xs font-medium text-gray-600 block">
              {STAY_LABELS[st]}
              {globalRates && globalRates[st] && !prices[st] && (
                <span className="text-gray-400 ml-1">
                  (global: {formatPrice(globalRates[st]!)})
                </span>
              )}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  Rp
                </span>
                <input
                  type="number"
                  value={prices[st]}
                  onChange={(e) =>
                    setPrices((prev) => ({ ...prev, [st]: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm"
                  placeholder="0"
                />
              </div>
              <button
                onClick={() => onSave(propertyId, st, prices[st], roomTypeId)}
                disabled={saving || !prices[st]}
                className="bg-blue-600 text-white rounded-lg px-3 py-2 text-xs font-medium hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
              >
                Simpan
              </button>
            </div>
          </div>
        ))}
      </div>

      {onBulkSave && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <button
            onClick={() =>
              onBulkSave(
                stayTypes
                  .filter((st) => prices[st])
                  .map((st) => ({ stayType: st, price: prices[st] }))
              )
            }
            disabled={saving || !stayTypes.some((st) => prices[st])}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
          >
            Simpan Semua Harga Sekaligus
          </button>
        </div>
      )}
    </div>
  );
}

function PriceCell({ data }: { data: { price: number; source: string } }) {
  const colorMap: Record<string, string> = {
    override: "text-amber-700 font-semibold",
    property: "text-blue-700",
    global: "text-gray-600",
    none: "text-gray-400",
  };
  const labelMap: Record<string, string> = {
    override: "✦",
    property: "●",
    global: "",
    none: "-",
  };

  return (
    <td className={`px-4 py-3 text-right text-sm ${colorMap[data.source]}`}>
      {data.price > 0 ? (
        <>
          {labelMap[data.source]}{" "}
          {formatPrice(data.price)}
        </>
      ) : (
        <span className="text-gray-400">-</span>
      )}
    </td>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    available: "bg-green-100 text-green-700",
    occupied: "bg-blue-100 text-blue-700",
    maintenance: "bg-yellow-100 text-yellow-700",
    blocked: "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = {
    available: "Kosong",
    occupied: "Terisi",
    maintenance: "Maintenance",
    blocked: "Blocked",
  };

  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] || "bg-gray-100 text-gray-600"}`}
    >
      {labels[status] || status}
    </span>
  );
}
