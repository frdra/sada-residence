import Link from "next/link";
import { getProperties, getRoomTypes, getRates } from "@/lib/db/queries";

const PROPERTY_COORDS = {
  persada: { lat: -8.80276, lng: 115.149165 },
  udayana: { lat: -8.7966184617018, lng: 115.18042708327252 },
  "taman-griya": { lat: -8.789160596129149, lng: 115.19042491449446 },
  "goa-gong": { lat: -8.801822363020166, lng: 115.17251562251298 },
} as const;

const PROPERTY_VIBES = {
  persada: { gradient: "from-terracotta-500 to-terracotta-700", accent: "Jimbaran Pusat", tagline: "Nyaman & Strategis" },
  udayana: { gradient: "from-charcoal-700 to-charcoal-600", accent: "Dekat Kampus", tagline: "Ideal untuk Mahasiswa" },
  "taman-griya": { gradient: "from-sage-500 to-sage-700", accent: "Suasana Asri", tagline: "Tenang & Damai" },
  "goa-gong": { gradient: "from-gold-400 to-terracotta-600", accent: "Dekat Pantai", tagline: "Eksklusif & Premium" },
} as const;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export default async function HomePage() {
  let properties: any[] = [];
  let roomTypes: any[] = [];
  let rates: any[] = [];

  try {
    [properties, roomTypes, rates] = await Promise.all([
      getProperties(),
      getRoomTypes(),
      getRates(),
    ]);
  } catch {
    // Fallback for when DB is not connected
  }

  const fallbackProperties = [
    { name: "Sada Residence Persada", slug: "persada", description: "Akomodasi modern di pusat kawasan Jimbaran dengan akses mudah ke segala fasilitas.", total_rooms: 30 },
    { name: "Sada Residence Udayana", slug: "udayana", description: "Lokasi strategis dekat kampus Udayana, ideal untuk mahasiswa dan profesional.", total_rooms: 33 },
    { name: "Sada Residence Taman Griya", slug: "taman-griya", description: "Hunian asri di lingkungan Taman Griya yang tenang, cocok untuk keluarga.", total_rooms: 33 },
    { name: "Sada Residence Goa Gong", slug: "goa-gong", description: "Hunian eksklusif di kawasan Goa Gong, dekat pantai dan pusat kuliner Jimbaran.", total_rooms: 24 },
  ];

  const displayProperties = properties.length > 0
    ? properties.map((p: any) => ({
        ...p,
        lat: PROPERTY_COORDS[p.slug as keyof typeof PROPERTY_COORDS]?.lat,
        lng: PROPERTY_COORDS[p.slug as keyof typeof PROPERTY_COORDS]?.lng,
      }))
    : fallbackProperties.map((p) => ({
        ...p,
        lat: PROPERTY_COORDS[p.slug as keyof typeof PROPERTY_COORDS]?.lat,
        lng: PROPERTY_COORDS[p.slug as keyof typeof PROPERTY_COORDS]?.lng,
      }));

  return (
    <>
      {/* ══════════════════════════════════════════════
          HERO — Full viewport, immersive
      ══════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 bg-charcoal-800" />
        <div className="absolute inset-0 bg-gradient-to-b from-charcoal-800/0 via-charcoal-800/50 to-charcoal-800" />

        {/* Decorative pattern — architectural grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 79px, #C4907F 79px, #C4907F 80px), repeating-linear-gradient(90deg, transparent, transparent 79px, #C4907F 79px, #C4907F 80px)`,
        }} />

        {/* Terracotta glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-terracotta-500/5 rounded-full blur-[120px]" />

        {/* Sage accent glow bottom */}
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-sage-500/5 rounded-full blur-[100px]" />

        {/* Floating organic wave — Peaceful pillar */}
        <svg className="absolute bottom-32 left-0 right-0 w-full h-24 opacity-10" viewBox="0 0 1440 96" fill="none" preserveAspectRatio="none">
          <path d="M0,48 C180,20 360,76 540,48 C720,20 900,76 1080,48 C1260,20 1440,48 1440,48" stroke="#A3B296" strokeWidth="1.5" fill="none" />
          <path d="M0,64 C240,36 480,92 720,64 C960,36 1200,92 1440,64" stroke="#C4907F" strokeWidth="1" fill="none" opacity="0.5" />
        </svg>

        {/* Content */}
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Logo mark */}
          <div className="mb-10 flex justify-center">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-60">
              <circle cx="40" cy="40" r="37" stroke="#C4907F" strokeWidth="0.8" />
              <rect x="28" y="20" width="24" height="28" rx="1" fill="none" stroke="#E8E4DE" strokeWidth="0.8" opacity="0.6" />
              <rect x="36" y="16" width="8" height="5" rx="0.5" fill="#C4907F" opacity="0.5" />
              <rect x="22" y="30" width="36" height="0.8" rx="0.4" fill="#C4907F" opacity="0.4" />
              <rect x="22" y="38" width="36" height="0.8" rx="0.4" fill="#C4907F" opacity="0.4" />
              <path d="M18,54 C28,48 38,58 48,52 C55,48 60,54 64,52" stroke="#A3B296" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5" />
            </svg>
          </div>

          {/* Brand name */}
          <h1 className="font-display text-6xl md:text-8xl font-light tracking-[0.4em] text-concrete-200 mb-3">
            SADA
          </h1>
          <p className="font-body text-xs md:text-sm font-normal tracking-[0.5em] text-terracotta-400 mb-10 uppercase">
            Residence
          </p>

          {/* Divider */}
          <div className="w-10 h-[1px] bg-terracotta-400/40 mx-auto mb-10" />

          {/* Tagline */}
          <p className="font-display text-2xl md:text-3xl font-light italic text-white/40 tracking-wider mb-4">
            Selalu Ada. <span className="text-white/20">Always Here.</span>
          </p>

          {/* Subtitle */}
          <p className="font-body text-sm md:text-base text-concrete-600 max-w-lg mx-auto mb-12 leading-relaxed">
            Hunian harian, mingguan & bulanan di kawasan Jimbaran, Bali.
            Hangat dalam karakter, simpel dalam desain, penuh kedamaian.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/booking"
              className="group relative bg-terracotta-500 text-white font-body font-semibold px-8 py-4 rounded-full text-sm hover:bg-terracotta-700 transition-all duration-300 hover:shadow-lg hover:shadow-terracotta-500/20"
            >
              Booking Sekarang
              <span className="absolute inset-0 rounded-full border border-terracotta-400/30 scale-110 opacity-0 group-hover:opacity-100 transition-all duration-500" />
            </Link>
            <Link
              href="/rooms"
              className="font-body font-medium px-8 py-4 rounded-full text-sm text-concrete-300 border border-concrete-600/30 hover:border-concrete-400/50 hover:text-white transition-all duration-300"
            >
              Lihat Kamar
            </Link>
          </div>

          {/* Three pillars */}
          <div className="mt-20 flex justify-center gap-12">
            {[
              { name: "Warm", sub: "Hangat" },
              { name: "Simpel", sub: "Sederhana" },
              { name: "Peaceful", sub: "Damai" },
            ].map((pillar) => (
              <div key={pillar.name} className="text-center">
                <div className="w-1 h-1 rounded-full bg-terracotta-400/60 mx-auto mb-3" />
                <p className="font-body text-[10px] tracking-[0.3em] uppercase text-white/20">
                  {pillar.name}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30">
          <div className="w-[1px] h-8 bg-gradient-to-b from-transparent to-concrete-400 animate-pulse" />
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          BRAND PHILOSOPHY — Transition section
      ══════════════════════════════════════════════ */}
      <section className="py-24 bg-[#FAFAF8] relative overflow-hidden">
        {/* Subtle texture */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-terracotta-400/20 to-transparent" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="font-body text-[10px] font-semibold tracking-[0.3em] uppercase text-terracotta-500 mb-6">
            Filosofi Kami
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-light text-charcoal-800 leading-relaxed mb-6">
            Satu hunian yang <span className="text-terracotta-500">abadi</span> —<br className="hidden md:block" />
            hangat dalam karakter, simpel dalam desain,<br className="hidden md:block" />
            dan penuh kedamaian dalam setiap sudutnya.
          </h2>
          <div className="w-10 h-[1px] bg-terracotta-400/30 mx-auto mb-6" />

          {/* Three pillars visual */}
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            {[
              {
                name: "Warm",
                sub: "Hangat",
                desc: "Kehangatan yang langsung terasa — terracotta yang memeluk, material jujur, rasa pulang ke rumah.",
                color: "text-terracotta-500",
                bgColor: "bg-terracotta-50",
                borderColor: "border-terracotta-200",
                icon: (
                  <svg viewBox="0 0 28 28" fill="none" stroke="#A0695A" strokeWidth="1.5" strokeLinecap="round" className="w-7 h-7">
                    <path d="M14 4c-3 4-6 7-6 10a6 6 0 0012 0c0-3-3-6-6-10z"/>
                    <path d="M14 17v-4"/>
                  </svg>
                ),
              },
              {
                name: "Simpel",
                sub: "Sederhana",
                desc: "Tanpa ornamen berlebihan — keindahan dari kejelasan bentuk dan ruang yang bernapas.",
                color: "text-charcoal-800",
                bgColor: "bg-concrete-100",
                borderColor: "border-concrete-300",
                icon: (
                  <svg viewBox="0 0 28 28" fill="none" stroke="#2C2C2C" strokeWidth="1.5" strokeLinecap="round" className="w-7 h-7">
                    <line x1="4" y1="14" x2="24" y2="14"/>
                    <line x1="8" y1="8" x2="20" y2="8"/>
                    <line x1="8" y1="20" x2="20" y2="20"/>
                  </svg>
                ),
              },
              {
                name: "Peaceful",
                sub: "Penuh Kedamaian",
                desc: "Koneksi dengan alam yang menciptakan ketenangan — tanaman tropis, ruang terbuka yang mengalir.",
                color: "text-sage-500",
                bgColor: "bg-sage-50",
                borderColor: "border-sage-200",
                icon: (
                  <svg viewBox="0 0 28 28" fill="none" stroke="#7A8B6F" strokeWidth="1.5" strokeLinecap="round" className="w-7 h-7">
                    <path d="M3,18 C8,14 13,20 18,16 C22,13 25,16 26,16"/>
                    <path d="M12,10 C14,6 17,8 18,4"/>
                    <path d="M8,14 C10,10 13,12 14,8"/>
                  </svg>
                ),
              },
            ].map((pillar) => (
              <div key={pillar.name} className={`${pillar.bgColor} rounded-2xl p-8 border ${pillar.borderColor} text-center transition-all duration-300 hover:shadow-md hover:-translate-y-1`}>
                <div className="flex justify-center mb-5">
                  <div className={`w-14 h-14 rounded-full ${pillar.bgColor} border ${pillar.borderColor} flex items-center justify-center`}>
                    {pillar.icon}
                  </div>
                </div>
                <h3 className={`font-display text-2xl font-light ${pillar.color} mb-1`}>{pillar.name}</h3>
                <p className="font-body text-xs tracking-wider uppercase text-concrete-600 mb-4">{pillar.sub}</p>
                <p className="font-body text-sm text-charcoal-600 leading-relaxed">{pillar.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          PROPERTIES — 4 lokasi
      ══════════════════════════════════════════════ */}
      <section id="properties" className="py-24 bg-concrete-200/50 relative">
        {/* Top decorative line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-concrete-400/30 to-transparent" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="font-body text-[10px] font-semibold tracking-[0.3em] uppercase text-terracotta-500 mb-4">
              04 Lokasi
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-light text-charcoal-800 mb-4">
              Properti Kami
            </h2>
            <p className="font-body text-sm text-charcoal-600 max-w-lg mx-auto leading-relaxed">
              Empat lokasi strategis di kawasan Jimbaran, masing-masing dengan karakter uniknya sendiri.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {displayProperties.map((property: any) => {
              const vibe = PROPERTY_VIBES[property.slug as keyof typeof PROPERTY_VIBES] || PROPERTY_VIBES.persada;
              const shortName = property.name.replace("Sada Residence ", "");

              return (
                <div key={property.slug} className="group relative bg-white rounded-2xl overflow-hidden border border-concrete-200 hover:shadow-xl transition-all duration-500 hover:-translate-y-1">
                  {/* Visual header */}
                  <div className={`relative h-52 bg-gradient-to-br ${vibe.gradient} overflow-hidden`}>
                    {/* Decorative architectural pattern */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-4 left-4 right-4 bottom-4 border border-white/30 rounded-xl" />
                      <div className="absolute top-8 left-8 right-8 bottom-8 border border-white/20 rounded-lg" />
                      {/* Horizontal lines — Simpel reference */}
                      <div className="absolute top-1/3 left-0 right-0 h-px bg-white/20" />
                      <div className="absolute top-2/3 left-0 right-0 h-px bg-white/20" />
                    </div>
                    {/* Wave at bottom — Peaceful reference */}
                    <svg className="absolute bottom-0 left-0 right-0 w-full h-12" viewBox="0 0 400 48" fill="none" preserveAspectRatio="none">
                      <path d="M0,48 L0,24 C100,40 200,10 300,28 C350,36 380,20 400,24 L400,48 Z" fill="white" />
                      <path d="M0,24 C100,40 200,10 300,28 C350,36 380,20 400,24" stroke="white" strokeWidth="0.5" fill="none" opacity="0.5" />
                    </svg>
                    {/* Property name overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                      <span className="font-display text-3xl font-light tracking-wider">{shortName}</span>
                      <span className="font-body text-[10px] tracking-[0.3em] uppercase mt-2 text-white/60">{vibe.tagline}</span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-display text-lg font-normal text-charcoal-800">{property.name}</h3>
                        <span className="inline-block mt-1 font-body text-[10px] tracking-wider uppercase px-2.5 py-1 bg-terracotta-50 text-terracotta-600 rounded-full">
                          {vibe.accent}
                        </span>
                      </div>
                      <span className="font-body text-sm font-semibold text-terracotta-500">
                        {property.total_rooms} Kamar
                      </span>
                    </div>
                    <p className="font-body text-sm text-charcoal-600 mb-5 leading-relaxed">{property.description}</p>
                    <div className="flex items-center justify-between">
                      <a
                        href={`https://www.google.com/maps?q=${property.lat},${property.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-body text-xs text-concrete-600 hover:text-terracotta-500 transition-colors flex items-center gap-1.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                        Google Maps
                      </a>
                      <Link
                        href={`/rooms?property=${property.slug}`}
                        className="font-body text-sm font-semibold text-terracotta-500 hover:text-terracotta-700 transition-colors flex items-center gap-1 group/link"
                      >
                        Lihat Kamar
                        <svg className="w-4 h-4 transition-transform group-hover/link:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total rooms badge */}
          <div className="mt-10 text-center">
            <span className="inline-flex items-center gap-3 font-body text-sm text-charcoal-600 bg-white px-6 py-3 rounded-full border border-concrete-200 shadow-sm">
              <span className="font-display text-2xl font-light text-terracotta-500">120</span>
              total kamar di 4 lokasi
            </span>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          FEATURES — Fasilitas dengan SVG icons
      ══════════════════════════════════════════════ */}
      <section id="features" className="py-24 bg-[#FAFAF8] relative">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-concrete-400/20 to-transparent" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="font-body text-[10px] font-semibold tracking-[0.3em] uppercase text-terracotta-500 mb-4">
              Fasilitas
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-light text-charcoal-800 mb-4">
              Kenyamanan di Setiap Detail
            </h2>
            <p className="font-body text-sm text-charcoal-600 max-w-lg mx-auto">
              Fasilitas lengkap yang dirancang untuk mendukung kenyamanan hunian Anda.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                title: "WiFi Fiber Optic",
                desc: "Internet cepat & stabil di semua area properti",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
                  </svg>
                ),
              },
              {
                title: "AC & Air Panas",
                desc: "AC dan water heater di setiap kamar",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  </svg>
                ),
              },
              {
                title: "Keamanan 24 Jam",
                desc: "CCTV dan akses kartu elektronik",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                ),
              },
              {
                title: "Housekeeping",
                desc: "Layanan kebersihan berkala profesional",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                  </svg>
                ),
              },
              {
                title: "Parkir Luas",
                desc: "Area parkir mobil & motor gratis",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                  </svg>
                ),
              },
              {
                title: "Dapur Bersama",
                desc: "Fasilitas dapur lengkap di setiap lantai",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                    <path d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
                  </svg>
                ),
              },
              {
                title: "Laundry",
                desc: "Area laundry dengan mesin cuci modern",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                  </svg>
                ),
              },
              {
                title: "Lokasi Strategis",
                desc: "Dekat kampus, pantai, mall, dan kuliner",
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                ),
              },
            ].map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl p-6 border border-concrete-200 text-center hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-xl bg-terracotta-50 border border-terracotta-100 flex items-center justify-center mx-auto mb-4 text-terracotta-500 group-hover:bg-terracotta-500 group-hover:text-white transition-all duration-300">
                  {f.icon}
                </div>
                <h3 className="font-body text-sm font-semibold text-charcoal-800 mb-1.5">{f.title}</h3>
                <p className="font-body text-xs text-charcoal-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          CTA — Immersive call to action
      ══════════════════════════════════════════════ */}
      <section className="relative py-32 bg-charcoal-800 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 79px, #C4907F 79px, #C4907F 80px), repeating-linear-gradient(90deg, transparent, transparent 79px, #C4907F 79px, #C4907F 80px)`,
        }} />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-terracotta-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[200px] h-[200px] bg-sage-500/5 rounded-full blur-[80px]" />

        {/* Wave decoration */}
        <svg className="absolute top-0 left-0 right-0 w-full h-16 opacity-10" viewBox="0 0 1440 64" fill="none" preserveAspectRatio="none">
          <path d="M0,32 C360,60 720,4 1080,32 C1260,48 1380,20 1440,32" stroke="#A3B296" strokeWidth="1.5" fill="none" />
        </svg>

        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <div className="w-10 h-[1px] bg-terracotta-400/30 mx-auto mb-8" />
          <h2 className="font-display text-3xl md:text-5xl font-light text-concrete-200 mb-5 leading-tight">
            Temukan Rumah Kedua Anda<br className="hidden md:block" /> di <span className="text-terracotta-400">Jimbaran</span>
          </h2>
          <p className="font-body text-sm text-concrete-600 mb-10 max-w-md mx-auto leading-relaxed">
            120 kamar di 4 lokasi strategis. Harian, mingguan, atau bulanan — kami selalu ada untuk Anda.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/booking"
              className="group bg-terracotta-500 text-white font-body font-semibold px-10 py-4 rounded-full text-sm hover:bg-terracotta-700 transition-all duration-300 hover:shadow-lg hover:shadow-terracotta-500/20"
            >
              Mulai Booking
            </Link>
            <a
              href="https://wa.me/6281234567890"
              target="_blank"
              rel="noopener noreferrer"
              className="font-body font-medium px-10 py-4 rounded-full text-sm text-concrete-300 border border-concrete-600/30 hover:border-concrete-400/50 hover:text-white transition-all duration-300 flex items-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Hubungi via WhatsApp
            </a>
          </div>
          <p className="font-display text-lg font-light italic text-white/15 tracking-wider mt-16">
            Selalu Ada. Always Here.
          </p>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          LOCATION — Maps section
      ══════════════════════════════════════════════ */}
      <section id="location" className="py-24 bg-[#FAFAF8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="font-body text-[10px] font-semibold tracking-[0.3em] uppercase text-terracotta-500 mb-4">
              Lokasi
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-light text-charcoal-800 mb-4">
              Temukan Kami di Jimbaran
            </h2>
            <p className="font-body text-sm text-charcoal-600">
              Kuta Selatan, Badung, Bali
            </p>
          </div>

          {/* Main map */}
          <div className="rounded-2xl overflow-hidden shadow-lg h-80 mb-10 border border-concrete-200">
            <iframe
              src="https://maps.google.com/maps?q=-8.797,115.170&z=13&output=embed"
              className="w-full h-full border-0"
              loading="lazy"
              allowFullScreen
            />
          </div>

          {/* Property location cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: "Persada", slug: "persada", lat: -8.80276, lng: 115.149165 },
              { name: "Udayana", slug: "udayana", lat: -8.7966184617018, lng: 115.18042708327252 },
              { name: "Taman Griya", slug: "taman-griya", lat: -8.789160596129149, lng: 115.19042491449446 },
              { name: "Goa Gong", slug: "goa-gong", lat: -8.801822363020166, lng: 115.17251562251298 },
            ].map((loc) => (
              <div key={loc.slug} className="bg-white rounded-2xl overflow-hidden border border-concrete-200 hover:shadow-lg transition-all duration-300">
                <div className="h-36 relative">
                  <iframe
                    src={encodeURI(`https://maps.google.com/maps?q=${loc.lat},${loc.lng}&z=16&output=embed`)}
                    className="absolute inset-0 w-full h-full border-0"
                    loading="lazy"
                    allowFullScreen
                  />
                </div>
                <div className="p-4 text-center">
                  <h3 className="font-display text-sm font-normal text-charcoal-800 mb-1.5">Sada Residence {loc.name}</h3>
                  <a
                    href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-body text-xs text-terracotta-500 hover:text-terracotta-700 font-medium transition-colors inline-flex items-center gap-1"
                  >
                    Buka di Maps
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
