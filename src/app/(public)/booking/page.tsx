"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface AvailableRoom {
  roomId: string;
  roomNumber: string;
  roomType: { id: string; name: string; slug: string };
  property: { id: string; name: string; slug: string };
  isAvailable: boolean;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-900" /></div>}>
      <BookingContent />
    </Suspense>
  );
}

function BookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(1); // 1: dates, 2: select room, 3: guest info
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Dates
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [propertyId, setPropertyId] = useState("");

  // Step 2: Available rooms
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<AvailableRoom | null>(null);

  // Step 3: Guest info
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [numGuests, setNumGuests] = useState(1);
  const [specialRequests, setSpecialRequests] = useState("");

  // Search availability
  const handleSearchAvailability = async () => {
    if (!checkIn || !checkOut) {
      setError("Silakan pilih tanggal check-in dan check-out");
      return;
    }
    if (new Date(checkIn) >= new Date(checkOut)) {
      setError("Tanggal check-out harus setelah tanggal check-in");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({ checkIn, checkOut });
      if (propertyId) params.set("propertyId", propertyId);

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

      // Redirect to payment or confirmation
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

  return (
    <div className="py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="section-title mb-2">Booking Kamar</h1>
        <p className="text-gray-600 mb-8">
          Pilih tanggal dan kamar yang Anda inginkan.
        </p>

        {/* Progress steps */}
        <div className="flex items-center gap-2 mb-8">
          {[
            { n: 1, label: "Tanggal" },
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
              <span className={`text-sm ${step >= s.n ? "text-navy-900 font-medium" : "text-gray-400"}`}>
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

        {/* Step 1: Dates */}
        {step === 1 && (
          <div className="card p-8">
            <h2 className="font-display text-xl font-bold mb-6">Pilih Tanggal</h2>
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Check-in
                </label>
                <input
                  type="date"
                  className="input-field"
                  value={checkIn}
                  min={today}
                  onChange={(e) => setCheckIn(e.target.value)}
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
                  min={checkIn || today}
                  onChange={(e) => setCheckOut(e.target.value)}
                />
              </div>
            </div>

            <button
              onClick={handleSearchAvailability}
              disabled={loading}
              className="btn-primary w-full mt-4"
            >
              {loading ? "Mencari..." : "Cek Ketersediaan"}
            </button>
          </div>
        )}

        {/* Step 2: Select Room */}
        {step === 2 && (
          <div>
            <button
              onClick={() => setStep(1)}
              className="text-sm text-navy-600 mb-4 hover:underline"
            >
              &larr; Ubah Tanggal
            </button>

            <p className="text-sm text-gray-500 mb-4">
              {checkIn} &rarr; {checkOut} &middot;{" "}
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
                        <h3 className="font-semibold">
                          {room.roomType.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {room.property.name} &middot; Kamar {room.roomNumber}
                        </p>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 ${
                          selectedRoom?.roomId === room.roomId
                            ? "border-brand-400 bg-brand-400"
                            : "border-gray-300"
                        }`}
                      />
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
                      <option key={n} value={n}>{n} orang</option>
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
