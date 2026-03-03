import Link from "next/link";
import { getProperties, getRoomTypes, getRates } from "@/lib/db/queries";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

// Property-specific data that lives alongside the DB data
const PROPERTY_DETAILS: Record<string, {
  gradient: string;
  floors: string;
  parking: string;
  roomTypeSlug: string;
  highlights: string[];
}> = {
  persada: {
    gradient: "from-terracotta-500 to-terracotta-700",
    floors: "Lantai 1 (8 kamar) · Lantai 2 (11 kamar) · Lantai 3 (11 kamar)",
    parking: "Parkir Motor 30 + Parkir Mobil 10",
    roomTypeSlug: "kamar-persada",
    highlights: ["Kompor dalam Kamar", "Kulkas Kecil", "Lokasi Pusat Jimbaran"],
  },
  udayana: {
    gradient: "from-charcoal-700 to-charcoal-600",
    floors: "Lantai 1 (10 kamar) · Lantai 2 (12 kamar) · Lantai 3 (12 kamar)",
    parking: "Parkir Motor 34 + Parkir Mobil 2",
    roomTypeSlug: "kamar-udayana",
    highlights: ["Kompor dalam Kamar", "Kulkas Kecil", "Dekat Kampus Udayana"],
  },
  "taman-griya": {
    gradient: "from-sage-500 to-sage-700",
    floors: "Lantai 1 (13 kamar) · Lantai 2 (13 kamar) · Lantai 3 (13 kamar)",
    parking: "Parkir Motor 24 + Parkir Mobil 14",
    roomTypeSlug: "kamar-taman-griya",
    highlights: ["Kompor dalam Kamar", "Kulkas Kecil", "Suasana Asri & Tenang"],
  },
  "goa-gong": {
    gradient: "from-gold-400 to-terracotta-600",
    floors: "Lantai 2 (12 kamar) · Lantai 3 (12 kamar)",
    parking: "Parkir Motor (tanpa Parkir Mobil)",
    roomTypeSlug: "kamar-goa-gong",
    highlights: ["Dapur & Meja Makan Kecil", "Kulkas", "Dekat Pantai"],
  },
};

// Shared building facilities across all properties
const SHARED_FACILITIES = [
  {
    name: "Keamanan 24 Jam",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    name: "Housekeeping",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
  },
  {
    name: "Laundry Gratis 3x/Minggu",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25z" />
      </svg>
    ),
  },
  {
    name: "Wifi Fiber Optic",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
      </svg>
    ),
  },
];

export const metadata = {
  title: "Kamar & Properti — SADA Residence",
};

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string }>;
}) {
  const params = await searchParams;
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
    // DB not connected fallback
  }

  // Build property-room type mapping
  const getPropertyRoomType = (propertySlug: string) => {
    const details = PROPERTY_DETAILS[propertySlug];
    if (!details) return null;
    return roomTypes.find((rt: any) => rt.slug === details.roomTypeSlug);
  };

  const getPropertyRates = (roomTypeId: string) => {
    return rates.filter((r: any) => r.room_type_id === roomTypeId);
  };

  const displayProperties = properties.length > 0 ? properties : [
    { name: "Sada Residence Persada", slug: "persada", description: "Akomodasi modern dan nyaman di pusat kawasan Jimbaran.", total_rooms: 30 },
    { name: "Sada Residence Udayana", slug: "udayana", description: "Lokasi strategis dekat kampus Udayana, ideal untuk mahasiswa dan profesional.", total_rooms: 34 },
    { name: "Sada Residence Taman Griya", slug: "taman-griya", description: "Hunian asri di lingkungan Taman Griya yang tenang, cocok untuk keluarga.", total_rooms: 39 },
    { name: "Sada Residence Goa Gong", slug: "goa-gong", description: "Hunian eksklusif di kawasan Goa Gong, dekat pantai dan pusat kuliner Jimbaran.", total_rooms: 24 },
  ];

  return (
    <div className="pt-24 pb-16 bg-[#FAFAF8] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <p className="font-body text-[10px] font-semibold tracking-[0.3em] uppercase text-terracotta-500 mb-3">
            Akomodasi
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-light text-charcoal-800 mb-3">
            Kamar & Properti
          </h1>
          <p className="font-body text-sm text-charcoal-600 max-w-lg">
            Setiap properti SADA Residence memiliki karakteristik unik. Temukan yang paling sesuai untuk Anda.
          </p>
        </div>

        {/* Property filter */}
        <div className="flex flex-wrap gap-3 mb-10">
          <Link
            href="/rooms"
            className={`px-5 py-2.5 rounded-full text-sm font-body font-medium transition-all duration-300 ${
              !params.property
                ? "bg-terracotta-500 text-white shadow-sm"
                : "bg-white text-charcoal-600 border border-concrete-300 hover:border-terracotta-400 hover:text-terracotta-500"
            }`}
          >
            Semua Properti
          </Link>
          {displayProperties.map((p: any) => (
            <Link
              key={p.slug}
              href={`/rooms?property=${p.slug}`}
              className={`px-5 py-2.5 rounded-full text-sm font-body font-medium transition-all duration-300 ${
                params.property === p.slug
                  ? "bg-terracotta-500 text-white shadow-sm"
                  : "bg-white text-charcoal-600 border border-concrete-300 hover:border-terracotta-400 hover:text-terracotta-500"
              }`}
            >
              {p.name.replace("Sada Residence ", "")}
            </Link>
          ))}
        </div>

        {/* Property cards */}
        <div className="space-y-10">
          {displayProperties
            .filter((p: any) => !params.property || p.slug === params.property)
            .map((property: any) => {
              const details = PROPERTY_DETAILS[property.slug as keyof typeof PROPERTY_DETAILS];
              const rt = getPropertyRoomType(property.slug);
              const propertyRates = rt ? getPropertyRates(rt.id) : [];
              const amenities: string[] = rt?.amenities || [];

              return (
                <div
                  key={property.slug}
                  className="bg-white rounded-2xl border border-concrete-200 overflow-hidden hover:shadow-lg transition-all duration-300"
                >
                  {/* Property header with gradient */}
                  <div className={`relative bg-gradient-to-r ${details?.gradient || "from-charcoal-700 to-charcoal-600"} p-8 pb-10 text-white`}>
                    {/* Decorative wave */}
                    <svg className="absolute bottom-0 left-0 right-0 w-full h-6" viewBox="0 0 1200 24" fill="none" preserveAspectRatio="none">
                      <path d="M0,12 C200,20 400,4 600,12 C800,20 1000,4 1200,12 L1200,24 L0,24 Z" fill="white" />
                    </svg>
                    <div className="relative z-10">
                      <h2 className="font-display text-2xl md:text-3xl font-light mb-2">{property.name}</h2>
                      <p className="font-body text-sm text-white/70 max-w-lg">{property.description}</p>
                      <div className="flex flex-wrap gap-4 mt-4 text-sm font-body">
                        <span className="flex items-center gap-1.5 text-white/80">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5M3.75 3v18m16.5-18v18M5.25 3h13.5M5.25 21V6h13.5v15" />
                          </svg>
                          {property.total_rooms} Kamar
                        </span>
                        {rt && (
                          <span className="flex items-center gap-1.5 text-white/80">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                            </svg>
                            {rt.room_size_sqm}m² per kamar
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-8">
                    <div className="lg:flex gap-8">
                      {/* Left: Room info */}
                      <div className="lg:w-3/5">
                        {/* Room highlights */}
                        {details && (
                          <div className="mb-6">
                            <h3 className="font-body text-xs font-semibold tracking-wider uppercase text-charcoal-600 mb-3">Keunggulan Kamar</h3>
                            <div className="flex flex-wrap gap-2">
                              {details.highlights.map((h) => (
                                <span key={h} className="px-3 py-1.5 bg-terracotta-50 text-terracotta-600 text-xs font-body font-medium rounded-full border border-terracotta-100">
                                  {h}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* In-room amenities */}
                        {amenities.length > 0 && (
                          <div className="mb-6">
                            <h3 className="font-body text-xs font-semibold tracking-wider uppercase text-charcoal-600 mb-3">Fasilitas Kamar</h3>
                            <div className="flex flex-wrap gap-2">
                              {amenities.map((a: string) => (
                                <span key={a} className="px-3 py-1.5 bg-concrete-100 text-charcoal-600 text-xs font-body rounded-full border border-concrete-200">
                                  {a}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Floor distribution */}
                        {details && (
                          <div className="mb-6">
                            <h3 className="font-body text-xs font-semibold tracking-wider uppercase text-charcoal-600 mb-3">Distribusi Lantai</h3>
                            <p className="font-body text-sm text-charcoal-600">{details.floors}</p>
                          </div>
                        )}

                        {/* Parking */}
                        {details && (
                          <div className="mb-6">
                            <h3 className="font-body text-xs font-semibold tracking-wider uppercase text-charcoal-600 mb-3">Parkir</h3>
                            <p className="font-body text-sm text-charcoal-600 flex items-center gap-2">
                              <svg className="w-4 h-4 text-terracotta-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                              </svg>
                              {details.parking}
                            </p>
                          </div>
                        )}

                        {/* Building facilities */}
                        <div className="mb-6">
                          <h3 className="font-body text-xs font-semibold tracking-wider uppercase text-charcoal-600 mb-3">Fasilitas Gedung</h3>
                          <div className="flex flex-wrap gap-3">
                            {SHARED_FACILITIES.map((f) => (
                              <span key={f.name} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sage-50 text-sage-700 text-xs font-body rounded-full border border-sage-200">
                                {f.icon}
                                {f.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right: Pricing & CTA */}
                      <div className="lg:w-2/5">
                        {/* Pricing */}
                        {propertyRates.length > 0 && (
                          <div className="bg-concrete-100 rounded-xl p-5 mb-6">
                            <h4 className="font-body text-xs font-semibold tracking-wider uppercase text-charcoal-600 mb-4">Harga</h4>
                            <div className="space-y-3">
                              {propertyRates.map((rate: any) => (
                                <div key={rate.id} className="bg-white rounded-lg p-4 flex items-center justify-between">
                                  <div>
                                    <p className="font-body text-[10px] tracking-wider uppercase text-concrete-600">
                                      {rate.stay_type === "daily" ? "Harian" : rate.stay_type === "weekly" ? "Mingguan" : "Bulanan"}
                                    </p>
                                    <p className="font-body text-[10px] text-concrete-500">
                                      min. {rate.min_stay} {rate.stay_type === "daily" ? "malam" : rate.stay_type === "weekly" ? "hari" : "hari"}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-display text-lg font-light text-charcoal-800">
                                      {formatCurrency(rate.price)}
                                    </p>
                                    <p className="font-body text-[10px] text-concrete-600">
                                      {rate.stay_type === "daily" ? "/malam" : rate.stay_type === "weekly" ? "/minggu" : "/bulan"}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* CTA */}
                        <Link
                          href={`/booking?property=${property.slug}`}
                          className="flex items-center justify-center gap-2 w-full bg-terracotta-500 text-white font-body font-semibold px-6 py-3.5 rounded-full text-sm hover:bg-terracotta-700 transition-all duration-300"
                        >
                          Booking {property.name.replace("Sada Residence ", "")}
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
