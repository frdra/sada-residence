"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type StayType = "daily" | "weekly" | "monthly";

interface PropertyAvailability {
  propertyId: string;
  propertyName: string;
  slug: string;
  available: number;
}

// ── Helpers ──

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function addMonths(date: string, months: number): string {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

function diffDays(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Main ──

export default function BookingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-900" />
        </div>
      }
    >
      <BookingContent />
    </Suspense>
  );
}

function BookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Property
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [selectedPropertyName, setSelectedPropertyName] = useState("");

  // Step 2: Stay type & dates
  const [stayType, setStayType] = useState<StayType>("monthly");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [duration, setDuration] = useState(1);
  const [availableCount, setAvailableCount] = useState<number | null>(null);

  // Step 3: Guest info
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [numGuests, setNumGuests] = useState(1);
  const [specialRequests, setSpecialRequests] = useState("");
  const [paymentMethodType, setPaymentMethodType] = useState<"online" | "dp_online" | "pay_at_property">("online");

  // Fetch properties on load
  const [properties, setProperties] = useState<
    { id: string; name: string; slug: string; description: string; total_rooms: number }[]
  >([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/properties");
        if (res.ok) {
          const data = await res.json();
          if (data.properties) setProperties(data.properties);
        }
      } catch {
        // Fallback handled below
      }
    })();
  }, []);

  // Pre-select from URL
  useEffect(() => {
    const prop = searchParams.get("property");
    if (prop && properties.length > 0) {
      const found = properties.find((p) => p.slug === prop);
      if (found) {
        setSelectedPropertyId(found.id);
        setSelectedPropertyName(found.name);
      }
    }
  }, [searchParams, properties]);

  const nights = checkIn && checkOut ? diffDays(checkIn, checkOut) : 0;
  const today = new Date().toISOString().split("T")[0];

  // ── Handlers ──

  const handleCheckInChange = (date: string) => {
    setCheckIn(date);
    if (stayType === "monthly") setCheckOut(addMonths(date, duration));
    else if (stayType === "weekly") setCheckOut(addDays(date, duration * 7));
  };

  const handleDurationChange = (val: number) => {
    setDuration(val);
    if (checkIn) {
      if (stayType === "monthly") setCheckOut(addMonths(checkIn, val));
      else if (stayType === "weekly") setCheckOut(addDays(checkIn, val * 7));
    }
  };

  const handleStayTypeChange = (type: StayType) => {
    setStayType(type);
    setCheckOut("");
    setDuration(1);
    setAvailableCount(null);
    if (checkIn) {
      if (type === "monthly") setCheckOut(addMonths(checkIn, 1));
      else if (type === "weekly") setCheckOut(addDays(checkIn, 7));
    }
  };

  // Check availability for selected property & dates
  const handleCheckAvailability = async () => {
    if (!checkIn || !checkOut) {
      setError("Silakan pilih tanggal check-in");
      return;
    }
    if (nights <= 0) {
      setError("Tanggal check-out harus setelah check-in");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        checkIn,
        checkOut,
        propertyId: selectedPropertyId,
        mode: "summary",
      });
      const res = await fetch(`/api/availability?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal cek ketersediaan");

      const propData = data.properties?.find(
        (p: PropertyAvailability) => p.propertyId === selectedPropertyId
      );
      const count = propData?.available || 0;
      setAvailableCount(count);

      if (count === 0) {
        setError("Maaf, tidak ada kamar tersedia di properti ini untuk tanggal yang dipilih. Silakan coba tanggal atau properti lain.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToStep3 = () => {
    if (availableCount === null) {
      setError("Silakan cek ketersediaan terlebih dahulu");
      return;
    }
    if (availableCount === 0) {
      setError("Tidak ada kamar tersedia. Silakan pilih tanggal atau properti lain.");
      return;
    }
    setError("");
    setStep(3);
  };

  // Submit booking (auto-assign room)
  const handleSubmitBooking = async () => {
    if (!guestName || !guestEmail || !guestPhone) {
      setError("Silakan lengkapi data tamu");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Get available rooms for this property to auto-assign
      const params = new URLSearchParams({
        checkIn,
        checkOut,
        propertyId: selectedPropertyId,
      });
      const availRes = await fetch(`/api/availability?${params}`);
      const availData = await availRes.json();
      const rooms = availData.available || [];

      if (rooms.length === 0) {
        throw new Error("Maaf, kamar sudah tidak tersedia. Silakan coba lagi.");
      }

      // Auto-pick the first available room
      const autoRoom = rooms[0];

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: autoRoom.roomId,
          checkIn,
          checkOut,
          stayType,
          numGuests,
          specialRequests,
          paymentMethodType,
          guest: {
            fullName: guestName,
            email: guestEmail,
            phone: guestPhone,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat booking");

      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        // pay_at_property → go directly to confirmation
        router.push(`/booking/${data.booking.id}/confirmation`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const stayTypeOptions = [
    { value: "monthly" as StayType, label: "Bulanan", icon: "🏠", desc: "Mulai 1 bulan" },
    { value: "weekly" as StayType, label: "Mingguan", icon: "📅", desc: "Mulai 1 minggu" },
    { value: "daily" as StayType, label: "Harian", icon: "🌙", desc: "Mulai 1 malam" },
  ];

  const stepLabels = [
    { n: 1, label: "Pilih Properti" },
    { n: 2, label: "Tanggal & Durasi" },
    { n: 3, label: "Data Tamu" },
  ];

  return (
    <div className="py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="section-title mb-2">Booking Kamar</h1>
        <p className="text-gray-600 mb-8">
          Pilih properti, tentukan tanggal, dan lengkapi data Anda.
        </p>

        {/* Progress steps */}
        <div className="flex items-center gap-2 mb-8">
          {stepLabels.map((s) => (
            <div key={s.n} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  step >= s.n
                    ? "bg-navy-900 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {step > s.n ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                  </svg>
                ) : (
                  s.n
                )}
              </div>
              <span
                className={`text-sm hidden sm:inline ${
                  step >= s.n ? "text-navy-900 font-medium" : "text-gray-400"
                }`}
              >
                {s.label}
              </span>
              {s.n < 3 && <div className="w-8 h-px bg-gray-300" />}
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        {/* ════ STEP 1: Pilih Properti ════ */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="card p-8">
              <h2 className="font-display text-xl font-bold mb-2">Pilih Lokasi Properti</h2>
              <p className="text-sm text-gray-500 mb-6">Kami memiliki 4 lokasi di kawasan Jimbaran, Bali</p>

              <div className="grid sm:grid-cols-2 gap-4">
                {(properties.length > 0
                  ? properties
                  : [
                      { id: "1", name: "Sada Residence Persada", slug: "persada", description: "Jl. Raya Jimbaran", total_rooms: 30 },
                      { id: "2", name: "Sada Residence Udayana", slug: "udayana", description: "Jl. Kampus Udayana", total_rooms: 33 },
                      { id: "3", name: "Sada Residence Taman Griya", slug: "taman-griya", description: "Jl. Taman Griya", total_rooms: 33 },
                      { id: "4", name: "Sada Residence Goa Gong", slug: "goa-gong", description: "Jl. Goa Gong", total_rooms: 24 },
                    ]
                ).map((prop) => (
                  <button
                    key={prop.id}
                    onClick={() => {
                      setSelectedPropertyId(prop.id);
                      setSelectedPropertyName(prop.name);
                      setAvailableCount(null);
                      setError("");
                    }}
                    className={`p-5 rounded-xl border-2 text-left transition-all ${
                      selectedPropertyId === prop.id
                        ? "border-brand-400 bg-brand-50 shadow-sm"
                        : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-navy-900 leading-tight">
                        {prop.name.replace("Sada Residence ", "")}
                      </h3>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ml-2 ${
                          selectedPropertyId === prop.id
                            ? "border-brand-400 bg-brand-400"
                            : "border-gray-300"
                        }`}
                      >
                        {selectedPropertyId === prop.id && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">{prop.description}</p>
                    <p className="text-xs text-brand-500 font-medium mt-2">{prop.total_rooms} kamar</p>
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  if (!selectedPropertyId) {
                    setError("Silakan pilih properti terlebih dahulu");
                    return;
                  }
                  setError("");
                  setStep(2);
                }}
                className="btn-primary w-full mt-6"
              >
                Lanjutkan
              </button>
            </div>
          </div>
        )}

        {/* ════ STEP 2: Stay Type & Dates ════ */}
        {step === 2 && (
          <div className="space-y-6">
            <button
              onClick={() => { setStep(1); setAvailableCount(null); }}
              className="text-sm text-navy-600 hover:underline"
            >
              &larr; Ubah Properti
            </button>

            {/* Selected property badge */}
            <div className="bg-navy-50 rounded-lg px-4 py-3 flex items-center gap-2">
              <span className="text-sm text-gray-600">Properti:</span>
              <span className="text-sm font-semibold text-navy-900">{selectedPropertyName}</span>
            </div>

            {/* Stay type */}
            <div className="card p-8">
              <h2 className="font-display text-xl font-bold mb-4">Jenis Booking</h2>
              <div className="grid grid-cols-3 gap-3">
                {stayTypeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleStayTypeChange(opt.value)}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${
                      stayType === opt.value
                        ? "border-brand-400 bg-brand-50 shadow-sm"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-2xl mb-1">{opt.icon}</div>
                    <div className="font-semibold text-sm">{opt.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Dates */}
            <div className="card p-8">
              <h2 className="font-display text-xl font-bold mb-4">Pilih Tanggal</h2>

              {stayType === "daily" ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Check-in</label>
                    <input
                      type="date"
                      className="input-field"
                      value={checkIn}
                      min={today}
                      onChange={(e) => {
                        setCheckIn(e.target.value);
                        if (checkOut && e.target.value >= checkOut) setCheckOut("");
                        setAvailableCount(null);
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Check-out</label>
                    <input
                      type="date"
                      className="input-field"
                      value={checkOut}
                      min={checkIn ? addDays(checkIn, 1) : today}
                      onChange={(e) => { setCheckOut(e.target.value); setAvailableCount(null); }}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Check-in</label>
                    <input
                      type="date"
                      className="input-field"
                      value={checkIn}
                      min={today}
                      onChange={(e) => { handleCheckInChange(e.target.value); setAvailableCount(null); }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Durasi</label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => { if (duration > 1) { handleDurationChange(duration - 1); setAvailableCount(null); } }}
                        className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center text-lg font-bold hover:bg-gray-50 disabled:opacity-40"
                        disabled={duration <= 1}
                      >
                        −
                      </button>
                      <div className="flex-1 text-center">
                        <span className="text-2xl font-bold text-navy-900">{duration}</span>
                        <span className="text-gray-500 ml-2">
                          {stayType === "weekly" ? "minggu" : "bulan"}
                        </span>
                      </div>
                      <button
                        onClick={() => { handleDurationChange(duration + 1); setAvailableCount(null); }}
                        className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center text-lg font-bold hover:bg-gray-50"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Date summary */}
              {checkIn && checkOut && nights > 0 && (
                <div className="bg-brand-50 rounded-lg p-4 text-sm mt-4 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Check-in</span>
                    <span className="font-medium">{formatDate(checkIn)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Check-out</span>
                    <span className="font-medium">{formatDate(checkOut)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-brand-200">
                    <span className="text-gray-600">Total</span>
                    <span className="font-semibold text-navy-900">{nights} malam</span>
                  </div>
                </div>
              )}

              {/* Availability result */}
              {availableCount !== null && availableCount > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm mt-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-green-800">
                      {availableCount} kamar tersedia
                    </p>
                    <p className="text-green-600 text-xs">
                      di {selectedPropertyName} untuk tanggal yang dipilih
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCheckAvailability}
                  disabled={loading || !checkIn || !checkOut}
                  className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
                    availableCount !== null && availableCount > 0
                      ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      : "btn-primary"
                  }`}
                >
                  {loading ? "Mencari..." : availableCount !== null ? "Cek Ulang" : "Cek Ketersediaan"}
                </button>

                {availableCount !== null && availableCount > 0 && (
                  <button onClick={handleGoToStep3} className="flex-1 btn-primary">
                    Lanjutkan Booking
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════ STEP 3: Guest Info ════ */}
        {step === 3 && (
          <div>
            <button
              onClick={() => setStep(2)}
              className="text-sm text-navy-600 mb-4 hover:underline"
            >
              &larr; Ubah Tanggal
            </button>

            {/* Booking summary card */}
            <div className="bg-navy-50 rounded-xl p-5 mb-6 space-y-2 text-sm">
              <h3 className="font-display font-bold text-navy-900 mb-3">Ringkasan Booking</h3>
              <div className="flex justify-between">
                <span className="text-gray-600">Properti</span>
                <span className="font-medium">{selectedPropertyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Jenis</span>
                <span className="font-medium">
                  {stayType === "daily" ? "Harian" : stayType === "weekly" ? "Mingguan" : "Bulanan"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Check-in</span>
                <span className="font-medium">{formatDate(checkIn)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Check-out</span>
                <span className="font-medium">{formatDate(checkOut)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-navy-200">
                <span className="text-gray-600">Durasi</span>
                <span className="font-bold text-navy-900">{nights} malam</span>
              </div>
              <p className="text-xs text-gray-500 pt-2">
                Kamar akan dipilihkan otomatis oleh sistem.
              </p>
            </div>

            {/* Payment method selection */}
            <div className="card p-8 mb-6">
              <h2 className="font-display text-xl font-bold mb-2">Metode Pembayaran</h2>
              <p className="text-sm text-gray-500 mb-5">Pilih cara pembayaran yang paling nyaman untuk Anda</p>

              <div className="space-y-3">
                {([
                  {
                    value: "online" as const,
                    label: "Bayar Online Penuh",
                    icon: "💳",
                    desc: "Bayar seluruh biaya secara online sekarang",
                    badge: null,
                  },
                  {
                    value: "dp_online" as const,
                    label: "DP Online + Sisa di Lokasi",
                    icon: "🏦",
                    desc: "Bayar DP online, sisa dibayar saat check-in (Cash/QRIS/Transfer)",
                    badge: "Populer",
                  },
                  {
                    value: "pay_at_property" as const,
                    label: "Bayar di Lokasi",
                    icon: "🏠",
                    desc: "Bayar penuh saat tiba di properti (Cash/QRIS/Transfer Bank)",
                    badge: null,
                  },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPaymentMethodType(opt.value)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-start gap-4 ${
                      paymentMethodType === opt.value
                        ? "border-brand-400 bg-brand-50 shadow-sm"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-2xl mt-0.5">{opt.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-navy-900">{opt.label}</span>
                        {opt.badge && (
                          <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{opt.badge}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5 ${
                        paymentMethodType === opt.value
                          ? "border-brand-400 bg-brand-400"
                          : "border-gray-300"
                      }`}
                    >
                      {paymentMethodType === opt.value && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {paymentMethodType === "pay_at_property" && (
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                  <p className="font-medium text-blue-800 mb-1">Metode pembayaran di lokasi:</p>
                  <div className="flex gap-3 text-blue-700">
                    <span className="flex items-center gap-1">💵 Cash</span>
                    <span className="flex items-center gap-1">📱 QRIS</span>
                    <span className="flex items-center gap-1">🏧 Transfer Bank</span>
                  </div>
                  <p className="text-blue-600 text-xs mt-2">Pembayaran dilakukan saat check-in di resepsionis properti.</p>
                </div>
              )}

              {paymentMethodType === "dp_online" && (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
                  <p className="font-medium text-yellow-800 mb-1">Informasi DP:</p>
                  <p className="text-yellow-700 text-xs">Anda akan membayar deposit terlebih dahulu secara online. Sisa pembayaran dilunasi saat check-in di lokasi menggunakan Cash, QRIS, atau Transfer Bank.</p>
                </div>
              )}
            </div>

            {/* Guest form */}
            <div className="card p-8">
              <h2 className="font-display text-xl font-bold mb-6">Data Tamu</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Masukkan nama lengkap"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    className="input-field"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="email@contoh.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    No. WhatsApp / Telepon <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    className="input-field"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="08123456789"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jumlah Tamu
                  </label>
                  <select
                    className="input-field"
                    value={numGuests}
                    onChange={(e) => setNumGuests(parseInt(e.target.value))}
                  >
                    {[1, 2].map((n) => (
                      <option key={n} value={n}>{n} orang</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Catatan / Permintaan Khusus
                  </label>
                  <textarea
                    className="input-field"
                    rows={3}
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="Opsional — mis. lantai atas, dekat parkir, dll."
                  />
                </div>
              </div>

              <button
                onClick={handleSubmitBooking}
                disabled={loading}
                className="btn-primary w-full mt-6"
              >
                {loading
                  ? "Memproses Booking..."
                  : paymentMethodType === "pay_at_property"
                  ? "Konfirmasi Booking"
                  : paymentMethodType === "dp_online"
                  ? "Konfirmasi & Bayar DP"
                  : "Konfirmasi & Bayar"}
              </button>

              <p className="text-xs text-gray-400 text-center mt-3">
                Dengan melanjutkan, Anda menyetujui syarat dan ketentuan Sada Residence.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
