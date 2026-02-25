"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface Attendance {
  id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  clock_in_photo_url: string | null;
  clock_out_photo_url: string | null;
  clock_in_latitude: number | null;
  clock_in_longitude: number | null;
  clock_in_address: string | null;
  clock_out_latitude: number | null;
  clock_out_longitude: number | null;
  clock_out_address: string | null;
  is_late: boolean;
  late_minutes: number;
  work_duration_minutes: number | null;
  is_early_leave: boolean;
  status: string;
}

interface ShiftSettings {
  shift_start: string;
  shift_end: string;
  late_tolerance_minutes: number;
}

export default function AttendancePage() {
  const [tab, setTab] = useState<"absen" | "riwayat">("absen");
  const [today, setToday] = useState<Attendance | null>(null);
  const [settings, setSettings] = useState<ShiftSettings | null>(null);
  const [history, setHistory] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  // Camera & GPS
  const [showCamera, setShowCamera] = useState(false);
  const [cameraAction, setCameraAction] = useState<"clock_in" | "clock_out">("clock_in");
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Properties for selection
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([]);
  const [selectedProperty, setSelectedProperty] = useState("");

  const fetchToday = useCallback(async () => {
    try {
      const res = await fetch("/api/staff/attendance?mode=today");
      const data = await res.json();
      setToday(data.attendance || null);
      setSettings(data.settings || null);
    } catch { /* ignore */ }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/staff/attendance?mode=history");
      const data = await res.json();
      setHistory(data.history || []);
      if (data.settings) setSettings(data.settings);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    Promise.all([
      fetchToday(),
      fetch("/api/staff/profile").then(r => r.json()).then(d => {
        if (d.properties) {
          setProperties(d.properties);
          if (d.properties.length > 0) setSelectedProperty(d.properties[0].id);
        }
      }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [fetchToday]);

  useEffect(() => {
    if (tab === "riwayat") fetchHistory();
  }, [tab, fetchHistory]);

  // GPS
  const getLocation = () => {
    setGpsLoading(true);
    setGpsError("");

    if (!navigator.geolocation) {
      setGpsError("GPS tidak tersedia di perangkat ini");
      setGpsLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        // Try reverse geocoding
        let address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`
          );
          const geo = await res.json();
          if (geo.display_name) {
            address = geo.display_name;
          }
        } catch { /* use coordinates as fallback */ }

        setGpsLocation({ lat, lng, address });
        setGpsLoading(false);
      },
      (err) => {
        setGpsError(
          err.code === 1
            ? "Izin lokasi ditolak. Aktifkan GPS di pengaturan browser."
            : err.code === 2
            ? "Lokasi tidak tersedia"
            : "Timeout mendapatkan lokasi"
        );
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setMessage("Tidak dapat mengakses kamera. Pastikan izin kamera aktif.");
      setMessageType("error");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Mirror for selfie
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    // Add timestamp overlay
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, canvas.height - 60, canvas.width, 60);
    ctx.fillStyle = "#fff";
    ctx.font = "14px monospace";
    const now = new Date();
    ctx.fillText(
      now.toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
      12, canvas.height - 38
    );
    ctx.fillText(
      now.toLocaleTimeString("id-ID") + (gpsLocation ? ` · ${gpsLocation.address.slice(0, 50)}` : ""),
      12, canvas.height - 16
    );

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedPhoto(dataUrl);

    // Convert to blob
    canvas.toBlob((blob) => { if (blob) setCapturedBlob(blob); }, "image/jpeg", 0.85);

    stopCamera();
  };

  const openAttendanceFlow = (action: "clock_in" | "clock_out") => {
    setCameraAction(action);
    setCapturedPhoto(null);
    setCapturedBlob(null);
    setGpsLocation(null);
    setGpsError("");
    setMessage("");
    setShowCamera(true);
    getLocation();
  };

  useEffect(() => {
    if (showCamera && !capturedPhoto) {
      startCamera();
    }
    return () => { if (!showCamera) stopCamera(); };
  }, [showCamera, capturedPhoto]);

  const handleSubmitAttendance = async () => {
    if (!capturedBlob) {
      setMessage("Silakan ambil foto terlebih dahulu");
      setMessageType("error");
      return;
    }
    if (!gpsLocation) {
      setMessage("Menunggu lokasi GPS...");
      setMessageType("error");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("action", cameraAction);
      formData.append("latitude", gpsLocation.lat.toString());
      formData.append("longitude", gpsLocation.lng.toString());
      formData.append("address", gpsLocation.address);
      if (selectedProperty) formData.append("propertyId", selectedProperty);
      formData.append("photo", capturedBlob, `attendance_${cameraAction}.jpg`);

      const res = await fetch("/api/staff/attendance", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal absen");

      setMessage(data.message || "Berhasil!");
      setMessageType("success");
      setShowCamera(false);
      setCapturedPhoto(null);
      fetchToday();
    } catch (err: any) {
      setMessage(err.message);
      setMessageType("error");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "—";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}j ${m}m`;
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    present: { label: "Hadir", color: "bg-green-100 text-green-700" },
    late: { label: "Terlambat", color: "bg-yellow-100 text-yellow-700" },
    absent: { label: "Tidak Hadir", color: "bg-red-100 text-red-700" },
    half_day: { label: "Setengah Hari", color: "bg-orange-100 text-orange-700" },
    leave: { label: "Cuti", color: "bg-blue-100 text-blue-700" },
    sick: { label: "Sakit", color: "bg-purple-100 text-purple-700" },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const nowHour = new Date().getHours();
  const nowMinute = new Date().getMinutes();
  const currentTime = `${String(nowHour).padStart(2, "0")}:${String(nowMinute).padStart(2, "0")}`;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="text-center py-4">
        <p className="text-gray-500 text-sm">
          {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
        <p className="text-4xl font-bold text-blue-600 mt-1 font-mono">{currentTime}</p>
        {settings && (
          <p className="text-xs text-gray-400 mt-1">
            Shift: {settings.shift_start.slice(0, 5)} — {settings.shift_end.slice(0, 5)}
          </p>
        )}
      </div>

      {/* Message */}
      {message && !showCamera && (
        <div className={`p-3 rounded-xl text-sm font-medium ${messageType === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => setTab("absen")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "absen" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"}`}
        >
          Absensi
        </button>
        <button
          onClick={() => setTab("riwayat")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "riwayat" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"}`}
        >
          Riwayat
        </button>
      </div>

      {/* ── Tab: Absensi ── */}
      {tab === "absen" && !showCamera && (
        <div className="space-y-4">
          {/* Today's Status Card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <h3 className="font-semibold text-gray-800 mb-4">Status Hari Ini</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Clock In */}
              <div className={`rounded-xl p-4 text-center ${today?.clock_in ? "bg-green-50" : "bg-gray-50"}`}>
                <p className="text-xs text-gray-500 mb-1">Masuk</p>
                <p className={`text-xl font-bold ${today?.clock_in ? "text-green-600" : "text-gray-300"}`}>
                  {formatTime(today?.clock_in ?? null)}
                </p>
                {today?.is_late && (
                  <p className="text-[10px] text-yellow-600 font-medium mt-1">
                    Terlambat {today.late_minutes}m
                  </p>
                )}
                {today?.clock_in_photo_url && (
                  <img src={today.clock_in_photo_url} alt="Foto masuk" className="w-16 h-16 rounded-lg object-cover mx-auto mt-2" />
                )}
              </div>
              {/* Clock Out */}
              <div className={`rounded-xl p-4 text-center ${today?.clock_out ? "bg-blue-50" : "bg-gray-50"}`}>
                <p className="text-xs text-gray-500 mb-1">Pulang</p>
                <p className={`text-xl font-bold ${today?.clock_out ? "text-blue-600" : "text-gray-300"}`}>
                  {formatTime(today?.clock_out ?? null)}
                </p>
                {today?.work_duration_minutes && (
                  <p className="text-[10px] text-gray-500 font-medium mt-1">
                    Durasi: {formatDuration(today.work_duration_minutes)}
                  </p>
                )}
                {today?.clock_out_photo_url && (
                  <img src={today.clock_out_photo_url} alt="Foto pulang" className="w-16 h-16 rounded-lg object-cover mx-auto mt-2" />
                )}
              </div>
            </div>

            {today?.clock_in_address && (
              <p className="text-[10px] text-gray-400 mt-3 truncate">
                Lokasi masuk: {today.clock_in_address}
              </p>
            )}
          </div>

          {/* Property selection */}
          {properties.length > 1 && (
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <label className="block text-sm font-medium text-gray-700 mb-2">Lokasi Properti</label>
              <select
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm"
                value={selectedProperty}
                onChange={(e) => setSelectedProperty(e.target.value)}
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => openAttendanceFlow("clock_in")}
              disabled={!!today?.clock_in}
              className={`p-6 rounded-2xl text-center font-semibold shadow-sm transition-all ${
                today?.clock_in
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-green-500 text-white hover:bg-green-600 active:scale-95"
              }`}
            >
              <span className="text-3xl block mb-2">{today?.clock_in ? "✅" : "📸"}</span>
              <span className="text-sm">{today?.clock_in ? "Sudah Masuk" : "Absen Masuk"}</span>
            </button>
            <button
              onClick={() => openAttendanceFlow("clock_out")}
              disabled={!today?.clock_in || !!today?.clock_out}
              className={`p-6 rounded-2xl text-center font-semibold shadow-sm transition-all ${
                !today?.clock_in || today?.clock_out
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-blue-500 text-white hover:bg-blue-600 active:scale-95"
              }`}
            >
              <span className="text-3xl block mb-2">{today?.clock_out ? "✅" : "🏠"}</span>
              <span className="text-sm">{today?.clock_out ? "Sudah Pulang" : "Absen Pulang"}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Camera/GPS Capture Flow ── */}
      {showCamera && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">
              {cameraAction === "clock_in" ? "Absen Masuk" : "Absen Pulang"}
            </h3>
            <button
              onClick={() => { setShowCamera(false); stopCamera(); }}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              &times;
            </button>
          </div>

          {/* GPS Status */}
          <div className={`rounded-xl p-3 text-sm ${gpsLocation ? "bg-green-50" : gpsError ? "bg-red-50" : "bg-yellow-50"}`}>
            {gpsLoading ? (
              <div className="flex items-center gap-2 text-yellow-700">
                <div className="animate-spin w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full" />
                Mendapatkan lokasi GPS...
              </div>
            ) : gpsError ? (
              <div>
                <p className="text-red-700 font-medium">{gpsError}</p>
                <button onClick={getLocation} className="text-red-600 underline text-xs mt-1">Coba Lagi</button>
              </div>
            ) : gpsLocation ? (
              <div className="text-green-700">
                <p className="font-medium flex items-center gap-1">📍 Lokasi terdeteksi</p>
                <p className="text-xs mt-0.5 truncate">{gpsLocation.address}</p>
              </div>
            ) : null}
          </div>

          {/* Camera View or Captured Photo */}
          <div className="relative bg-black rounded-2xl overflow-hidden aspect-[4/3]">
            {!capturedPhoto ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
                {/* Capture Button */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                  <button
                    onClick={capturePhoto}
                    className="w-16 h-16 rounded-full bg-white border-4 border-gray-300 shadow-lg active:scale-90 transition-transform"
                  >
                    <div className="w-12 h-12 rounded-full bg-red-500 mx-auto" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
                <button
                  onClick={() => {
                    setCapturedPhoto(null);
                    setCapturedBlob(null);
                    startCamera();
                  }}
                  className="absolute top-3 right-3 bg-black/50 text-white px-3 py-1 rounded-lg text-sm"
                >
                  Ulang
                </button>
              </>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />

          {/* Submit */}
          {capturedPhoto && (
            <button
              onClick={handleSubmitAttendance}
              disabled={submitting || !gpsLocation}
              className="w-full py-4 rounded-2xl font-semibold text-white text-base transition-all disabled:opacity-50 bg-blue-600 hover:bg-blue-700 active:scale-[0.98]"
            >
              {submitting
                ? "Mengirim..."
                : !gpsLocation
                ? "Menunggu lokasi..."
                : cameraAction === "clock_in"
                ? "Kirim Absen Masuk"
                : "Kirim Absen Pulang"}
            </button>
          )}

          {message && (
            <div className={`p-3 rounded-xl text-sm font-medium ${messageType === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {message}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Riwayat ── */}
      {tab === "riwayat" && (
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <span className="text-4xl block mb-2">📋</span>
              <p className="text-sm">Belum ada riwayat absensi</p>
            </div>
          ) : (
            history.map((a) => {
              const st = statusLabels[a.status] || statusLabels.present;
              return (
                <div key={a.id} className="bg-white rounded-xl p-4 shadow-sm border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">
                      {new Date(a.date).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })}
                    </p>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${st.color}`}>
                      {st.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center text-xs">
                    <div>
                      <p className="text-gray-400">Masuk</p>
                      <p className="font-semibold text-green-600">{formatTime(a.clock_in)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Pulang</p>
                      <p className="font-semibold text-blue-600">{formatTime(a.clock_out)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Durasi</p>
                      <p className="font-semibold">{formatDuration(a.work_duration_minutes)}</p>
                    </div>
                  </div>
                  {a.is_late && (
                    <p className="text-[10px] text-yellow-600 mt-2">Terlambat {a.late_minutes} menit</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
