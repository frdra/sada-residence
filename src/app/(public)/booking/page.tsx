"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface AvailableRoom {
  roomId: string;
  roomNumber: string;
  roomType: { id: string; name: string; slug: string };
  property: { id: string; name: string; slug: string };
  isAvailable: boolean;
}

type StayType = "daily" | "weekly" | "monthly";

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

  const [step, setStep] = useState(1); // 1: stay type & dates, 2: select room, 3: guest info
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Stay type & dates
  const [stayType, setStayType] = useState<StayType>("daily");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [duration, setDuration] = useState(1); // weeks or months count

  // Step 2: Available rooms
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<AvailableRoom | null>(null);

  // Step 3: Guest info
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [numGuests, setNumGuests] = useState(1);
  const [specialRequests, setSpecialRequests] = useState("");

  // Auto-calculate checkout when check-in or duration changes
  const handleCheckInChange = (date: string) => {
    setCheckIn(date);
    if (stayType === "monthly") {
      setCheckOut(addMonths(date, duration));
    } else if (stayType === "weekly") {
      setCheckOut(addDays(date, duration * 7));
    }
  };

  const handleDurationChange = (val: number) => {
    setDuration(val);
    if (checkIn) {
      if (stayType === "monthly") {
        setCheckOut(addMonths(checkIn, val));
      } else if (stayType === "weekly") {
        setCheckOut(addDays(checkIn, val * 7));
      }
    }
  };

  const handleStayTypeChange = (type: StayType) => {
    setStayType(type);
    setCheckOut("");
    setDuration(1);
    if (checkIn) {
      if (type === "monthly") {
        setCheckOut(addMonths(checkIn, 1));
      } else if (type === "weekly") {
        setCheckOut(addDays(checkIn, 7));
      }
    }
  };

  // Computed info
  const nights = checkIn && checkOut ? diffDays(checkIn, checkOut) : 0;

  // Search availability
  const handleSearchAvailability = async () => {
    if (!checkIn || !checkOut) {
      setError("Silakan pilih tanggal check-in");
      return;
    }
    if (nights <= 0) {
      setError("Tanggal check-out harus setelah tanggal check-in");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ checkIn, checkOut });
      const res = await fetch(`/api/availability?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mencari kamar");

      setAvailableRooms(data.available || []);
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit booking
  const handleSubmitBooking = async () => {
    if (!selectedRoom) return;
    if (!guestName || !guestEmail || !guestPhone) {
      setError("Silakan lengkapi data tamu");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: selectedRoom.roomId,
          checkIn,
          checkOut,
          stayType,
          numGuests,
          specialRequests,
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
        router.push(`/booking/${data.booking.id}/confirmation`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];

  const stayTypeOptions = [
    { value: "daily" as StayType, label: "Harian", icon: "🌙", desc: "Minimal 1 malam" },
    { value: "weekly" as StayType, label: "Mingguan", icon: "📅", desc: "Minimal 1 minggu" },
    { value: "monthly" as StayType, label: "Bulanan", icon: "🏠", desc: "Minimal 1 bulan" },
  ];

  return (
    <div className="py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="section-title mb-2">Booking Kamar</h1>
        <p className="text-gray-600 mb-8">
          Pilih durasi tinggal dan tanggal yang Anda inginkan.
        </p>

        {/* Progress steps */}
        <div className="flex items-center gap-2 mb-8">
          {[
            { n: 1, label: "Durasi & Tanggal" },
            { n: 2, label: "Pilih Kamar" },
            { n: 3, label: "Data Tamu" },
          ].map((s) => (
            <div key={s.n} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step >= s.n
                    ? "bg-navy-900 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {s.n}
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

        {/* Step 1: Stay type & dates */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Stay type selector */}
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

            {/* Date selection */}
            <div className="card p-8">
              <h2 className="font-display text-xl font-bold mb-4">Pilih Tanggal</h2>

              {stayType === "daily" ? (
                /* Daily: user picks both dates */
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Check-in
                    </label>
                    <input
                      type="date"
                      className="input-field"
                      value={checkIn}
                      min={today}
                      onChange={(e) => {
                        setCheckIn(e.target.value);
                        if (checkOut && e.target.value >= checkOut) setCheckOut("");
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Check-out
                    </label>
                    <input
                      type="date"
                      className="input-field"
                      value={checkOut}
                      min={checkIn ? addDays(checkIn, 1) : today}
                      onChange={(e) => setCheckOut(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                /* Weekly/Monthly: pick check-in + duration, auto checkout */
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tanggal Check-in
                    </label>
                    <input
                      type="date"
                      className="input-field"
                      value={checkIn}
                      min={today}
                      onChange={(e) => handleCheckInChange(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Durasi
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => duration > 1 && handleDurationChange(duration - 1)}
                        className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center text-lg font-bold hover:bg-gray-50 disabled:opacity-40"
                        disabled={duration <= 1}
                      >
                        −
                      </button>
                      <div className="flex-1 text-center">
                        <span className="text-2xl font-bold text-navy-900">{duration}</span>
                        <span className="text-gray-500 ml-2">
                          {stayType === "weekly" ? (duration === 1 ? "minggu" : "minggu") : (duration === 1 ? "bulan" : "bulan")}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDurationChange(duration + 1)}
                        className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center text-lg font-bold hover:bg-gray-50"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  {checkIn && checkOut && (
                    <div className="bg-brand-50 rounded-lg p-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Check-in</span>
                        <span className="font-medium">{formatDate(checkIn)}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-gray-600">Check-out</span>
                        <span className="font-medium">{formatDate(checkOut)}</span>
                      </div>
                      <div className="flex justify-between mt-1 pt-2 border-t border-brand-200">
                        <span className="text-gray-600">Total</span>
                        <span className="font-semibold text-navy-900">{nights} malam</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Summary for daily */}
              {stayType === "daily" && checkIn && checkOut && nights > 0 && (
                <div className="bg-brand-50 rounded-lg p-4 text-sm mt-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Durasi</span>
                    <span className="font-semibold text-navy-900">{nights} malam</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleSearchAvailability}
                disabled={loading || !checkIn || !checkOut}
                className="btn-primary w-full mt-6"
              >
                {loading ? "Mencari..." : "Cek Ketersediaan"}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Select Room */}
        {step === 2 && (
          <div>
            <button
              onClick={() => { setStep(1); setSelectedRoom(null); }}
              className="text-sm text-navy-600 mb-4 hover:underline"
            >
              &larr; Ubah Tanggal
            </button>

            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-sm">
              <div className="flex flex-wrap gap-4">
                <div>
                  <span className="text-gray-500">Jenis: </span>
                  <span className="font-medium capitalize">
                    {stayType === "daily" ? "Harian" : stayType === "weekly" ? "Mingguan" : "Bulanan"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Check-in: </span>
                  <span className="font-medium">{formatDate(checkIn)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Check-out: </span>
                  <span className="font-medium">{formatDate(checkOut)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Durasi: </span>
                  <span className="font-medium">{nights} malam</span>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              {availableRooms.length} kamar tersedia
            </p>

            {availableRooms.length === 0 ? (
              <div className="card p-8 text-center">
                <p className="text-gray-500 mb-4">
                  Maaf, tidak ada kamar tersedia untuk tanggal yang dipilih.
                </p>
                <button onClick={() => setStep(1)} className="btn-outline text-sm">
                  Coba Tanggal Lain
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {availableRooms.map((room) => (
                  <div
                    key={room.roomId}
                    onClick={() => setSelectedRoom(room)}
                    className={`card p-6 cursor-pointer transition-all ${
                      selectedRoom?.roomId === room.roomId
                        ? "ring-2 ring-brand-400 shadow-md"
                        : "hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{room.roomType.name}</h3>
                        <p className="text-sm text-gray-500">
                          {room.property.name} &middot; Kamar {room.roomNumber}
                        </p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedRoom?.roomId === room.roomId
                            ? "border-brand-400 bg-brand-400"
                            : "border-gray-300"
                        }`}
                      >
                        {selectedRoom?.roomId === room.roomId && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => {
                    if (selectedRoom) {
                      setStep(3);
                      setError("");
                    } else {
                      setError("Silakan pilih kamar terlebih dahulu");
                    }
                  }}
                  className="btn-primary w-full"
                >
                  Lanjutkan
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Guest Info */}
        {step === 3 && (
          <div>
            <button
              onClick={() => setStep(2)}
              className="text-sm text-navy-600 mb-4 hover:underline"
            >
              &larr; Pilih Kamar Lain
            </button>

            <div className="card p-8">
              <h2 className="font-display text-xl font-bold mb-6">Data Tamu</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Lengkap *
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
                    Email *
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
                    No. Telepon *
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
                    {[1, 2, 3, 4].map((n) => (
                      <option key={n} value={n}>
                        {n} orang
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Permintaan Khusus
                  </label>
                  <textarea
                    className="input-field"
                    rows={3}
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder="Opsional"
                  />
                </div>
              </div>

              {/* Booking summary */}
              <div className="bg-gray-50 rounded-lg p-4 mt-6 text-sm space-y-2">
                <h3 className="font-semibold text-navy-900 mb-2">Ringkasan Booking</h3>
                <div className="flex justify-between">
                  <span className="text-gray-500">Kamar</span>
                  <span>{selectedRoom?.roomType.name} — {selectedRoom?.roomNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Properti</span>
                  <span>{selectedRoom?.property.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Check-in</span>
                  <span>{formatDate(checkIn)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Check-out</span>
                  <span>{formatDate(checkOut)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Durasi</span>
                  <span className="font-medium">
                    {nights} malam ({stayType === "daily" ? "Harian" : stayType === "weekly" ? "Mingguan" : "Bulanan"})
                  </span>
                </div>
              </div>

              <button
                onClick={handleSubmitBooking}
                disabled={loading}
                className="btn-primary w-full mt-6"
              >
                {loading ? "Memproses..." : "Konfirmasi & Bayar"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
