import Link from "next/link";
import { getProperties, getRoomTypes, getRates } from "@/lib/db/queries";

const PROPERTY_COORDS = {
  persada: { lat: -8.802760, lng: 115.149165 },
  udayana: { lat: -8.7966184617018, lng: 115.18042708327252 },
  "taman-griya": { lat: -8.789160596129149, lng: 115.19042491449446 },
  "goa-gong": { lat: -8.801822363020166, lng: 115.17251562251298 },
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

  return (
    <>
      {/* Hero */}
      <section className="relative bg-navy-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 opacity-90" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 md:py-40">
          <div className="max-w-2xl">
            <p className="text-brand-400 font-semibold mb-4 tracking-wider uppercase text-sm">
              Premium Accommodation in Jimbaran
            </p>
            <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight mb-6">
              Tinggal Nyaman di{" "}
              <span className="text-brand-400">Sada Residence</span>
            </h1>
            <p className="text-lg text-gray-300 mb-8 leading-relaxed">
              Akomodasi modern dengan fasilitas lengkap di kawasan Jimbaran, Bali.
              Tersedia untuk harian, mingguan, dan bulanan.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/booking" className="btn-secondary">
                Booking Sekarang
              </Link>
              <Link href="/rooms" className="btn-outline !border-white !text-white hover:!bg-white hover:!text-navy-900">
                Lihat Kamar
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Properties */}
      <section id="properties" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-title mb-4">Properti Kami</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Empat lokasi strategis di kawasan Jimbaran untuk memenuhi kebutuhan akomodasi Anda.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {(properties.length > 0
              ? properties.map((p: any) => ({ ...p, lat: PROPERTY_COORDS[p.slug as keyof typeof PROPERTY_COORDS]?.lat, lng: PROPERTY_COORDS[p.slug as keyof typeof PROPERTY_COORDS]?.lng }))
              : [
                  { name: "Sada Residence Persada", slug: "persada", description: "Akomodasi modern dan nyaman dengan fasilitas lengkap di kawasan Jimbaran.", total_rooms: 30, lat: -8.802760, lng: 115.149165 },
                  { name: "Sada Residence Udayana", slug: "udayana", description: "Lokasi strategis dekat kampus Udayana, ideal untuk mahasiswa dan profesional.", total_rooms: 33, lat: -8.7966184617018, lng: 115.18042708327252 },
                  { name: "Sada Residence Taman Griya", slug: "taman-griya", description: "Konsep taman asri dengan suasana tenang, cocok untuk keluarga dan wisatawan.", total_rooms: 33, lat: -8.789160596129149, lng: 115.19042491449446 },
                  { name: "Sada Residence Goa Gong", slug: "goa-gong", description: "Hunian eksklusif di kawasan Goa Gong dengan akses mudah ke pantai dan pusat kuliner.", total_rooms: 24, lat: -8.801822363020166, lng: 115.17251562251298 },
                ]
            ).map((property: any) => (
              <div key={property.slug} className="card group hover:shadow-lg transition-shadow">
                <div className="h-48 bg-gradient-to-br from-navy-800 to-navy-600 flex items-center justify-center">
                  <span className="font-display text-white text-2xl font-bold opacity-80">
                    {property.name.split(" ").pop()}
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="font-display text-xl font-bold mb-2">{property.name}</h3>
                  <p className="text-gray-600 text-sm mb-4">{property.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-brand-500 font-semibold">
                      {property.total_rooms} Kamar
                    </span>
                    <div className="flex gap-3">
                      <a
                        href={`https://www.google.com/maps?q=${property.lat},${property.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-400 hover:text-brand-500 transition-colors"
                        title="Buka di Google Maps"
                      >
                        📍
                      </a>
                      <Link
                        href={`/rooms?property=${property.slug}`}
                        className="text-sm text-navy-600 font-semibold hover:text-navy-900 transition-colors"
                      >
                        Lihat Kamar &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Room Types */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-title mb-4">Tipe Kamar</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Pilih tipe kamar yang sesuai dengan kebutuhan dan budget Anda.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {(roomTypes.length > 0
              ? roomTypes
              : [
                  { name: "Standard Room", slug: "standard", description: "Kamar standar yang nyaman", max_guests: 2, bed_type: "Double", room_size_sqm: 20 },
                  { name: "Deluxe Room", slug: "deluxe", description: "Kamar luas dengan pemandangan taman", max_guests: 2, bed_type: "Queen", room_size_sqm: 28 },
                  { name: "Suite Room", slug: "suite", description: "Suite premium dengan ruang tamu terpisah", max_guests: 4, bed_type: "King", room_size_sqm: 40 },
                ]
            ).map((rt) => {
              const dailyRate = rates.find(
                (r) => r.room_type_id === (rt as any).id && r.stay_type === "daily"
              );
              const monthlyRate = rates.find(
                (r) => r.room_type_id === (rt as any).id && r.stay_type === "monthly"
              );
              return (
                <div key={rt.slug} className="card hover:shadow-lg transition-shadow">
                  <div className="h-40 bg-gradient-to-br from-brand-100 to-brand-50 flex items-center justify-center">
                    <span className="text-brand-600 text-4xl font-bold">{rt.room_size_sqm}m²</span>
                  </div>
                  <div className="p-6">
                    <h3 className="font-display text-xl font-bold mb-2">{rt.name}</h3>
                    <p className="text-gray-600 text-sm mb-4">{rt.description}</p>
                    <div className="flex gap-4 text-xs text-gray-500 mb-4">
                      <span>{rt.max_guests} Tamu</span>
                      <span>{rt.bed_type} Bed</span>
                      <span>{rt.room_size_sqm}m²</span>
                    </div>
                    {dailyRate && (
                      <div className="border-t pt-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Mulai dari</span>
                          <span className="font-bold text-navy-900">
                            {formatCurrency(dailyRate.price)}
                            <span className="text-xs font-normal text-gray-400">/malam</span>
                          </span>
                        </div>
                        {monthlyRate && (
                          <div className="flex justify-between text-sm mt-1">
                            <span className="text-gray-500">Bulanan</span>
                            <span className="font-semibold text-brand-500">
                              {formatCurrency(monthlyRate.price)}
                              <span className="text-xs font-normal text-gray-400">/bulan</span>
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                    <Link
                      href={`/rooms?type=${rt.slug}`}
                      className="block mt-4 text-center btn-primary text-sm !py-2"
                    >
                      Lihat Detail
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-title mb-4">Fasilitas Unggulan</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: "📶", title: "WiFi Cepat", desc: "Internet fiber optic di semua area" },
              { icon: "❄️", title: "AC & Hot Water", desc: "AC dan water heater di setiap kamar" },
              { icon: "🔒", title: "Keamanan 24/7", desc: "CCTV dan akses kartu elektronik" },
              { icon: "🧹", title: "Housekeeping", desc: "Layanan kebersihan berkala" },
              { icon: "🅿️", title: "Parkir Luas", desc: "Parkir mobil dan motor gratis" },
              { icon: "🍽️", title: "Dapur Bersama", desc: "Fasilitas dapur di setiap lantai" },
              { icon: "👕", title: "Laundry", desc: "Mesin cuci di area laundry" },
              { icon: "📍", title: "Lokasi Strategis", desc: "Dekat kampus, pantai, dan mall" },
            ].map((f) => (
              <div key={f.title} className="card p-6 text-center hover:shadow-md transition-shadow">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-navy-900 text-white text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Siap untuk Tinggal di Sada Residence?
          </h2>
          <p className="text-gray-400 mb-8">
            Booking sekarang dan nikmati kenyamanan tinggal di Jimbaran, Bali.
          </p>
          <Link href="/booking" className="btn-secondary inline-block">
            Mulai Booking
          </Link>
        </div>
      </section>

      {/* Location */}
      <section id="location" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-title mb-4">Lokasi Kami</h2>
            <p className="text-gray-600">Empat lokasi strategis di kawasan Jimbaran, Kuta Selatan, Badung, Bali</p>
          </div>

          {/* Overview map showing Jimbaran area */}
          <div className="rounded-xl overflow-hidden shadow-lg h-96 mb-12">
            <iframe
              src="https://maps.google.com/maps?q=-8.797,115.170&z=13&output=embed"
              className="w-full h-full border-0"
              loading="lazy"
              allowFullScreen
            />
          </div>

          {/* Individual property locations */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: "Sada Residence Persada", slug: "persada", lat: -8.802760, lng: 115.149165 },
              { name: "Sada Residence Udayana", slug: "udayana", lat: -8.7966184617018, lng: 115.18042708327252 },
              { name: "Sada Residence Taman Griya", slug: "taman-griya", lat: -8.789160596129149, lng: 115.19042491449446 },
              { name: "Sada Residence Goa Gong", slug: "goa-gong", lat: -8.801822363020166, lng: 115.17251562251298 },
            ].map((loc) => (
              <div key={loc.slug} className="card overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-48 relative">
                  <iframe
                    src={encodeURI(`https://maps.google.com/maps?q=${loc.lat},${loc.lng}&z=16&output=embed`)}
                    className="absolute inset-0 w-full h-full border-0"
                    loading="lazy"
                    allowFullScreen
                  />
                </div>
                <div className="p-4 text-center">
                  <h3 className="font-display font-bold text-sm mb-1">{loc.name}</h3>
                  <a
                    href={`https://www.google.com/maps?q=${loc.lat},${loc.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand-500 hover:text-brand-600 font-semibold transition-colors"
                  >
                    Buka di Google Maps &rarr;
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
