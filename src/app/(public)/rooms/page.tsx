import Link from "next/link";
import { getProperties, getRoomTypes, getRates } from "@/lib/db/queries";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export const metadata = {
  title: "Tipe Kamar — SADA Residence",
};

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ property?: string; type?: string }>;
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

  return (
    <div className="pt-24 pb-16 bg-[#FAFAF8] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <p className="font-body text-[10px] font-semibold tracking-[0.3em] uppercase text-terracotta-500 mb-3">
            Akomodasi
          </p>
          <h1 className="font-display text-3xl md:text-4xl font-light text-charcoal-800 mb-3">
            Tipe Kamar
          </h1>
          <p className="font-body text-sm text-charcoal-600 max-w-lg">
            Pilih tipe kamar yang sesuai dengan kebutuhan Anda di SADA Residence.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-10">
          <Link
            href="/rooms"
            className={`px-5 py-2.5 rounded-full text-sm font-body font-medium transition-all duration-300 ${
              !params.type && !params.property
                ? "bg-terracotta-500 text-white shadow-sm"
                : "bg-white text-charcoal-600 border border-concrete-300 hover:border-terracotta-400 hover:text-terracotta-500"
            }`}
          >
            Semua
          </Link>
          {roomTypes.map((rt) => (
            <Link
              key={rt.slug}
              href={`/rooms?type=${rt.slug}`}
              className={`px-5 py-2.5 rounded-full text-sm font-body font-medium transition-all duration-300 ${
                params.type === rt.slug
                  ? "bg-terracotta-500 text-white shadow-sm"
                  : "bg-white text-charcoal-600 border border-concrete-300 hover:border-terracotta-400 hover:text-terracotta-500"
              }`}
            >
              {rt.name}
            </Link>
          ))}
        </div>

        {/* Room type cards */}
        <div className="space-y-10">
          {roomTypes
            .filter((rt) => !params.type || rt.slug === params.type)
            .map((rt) => {
              const rtRates = rates.filter((r) => r.room_type_id === rt.id);
              const amenities: string[] = rt.amenities || [];

              return (
                <div key={rt.id} className="bg-white rounded-2xl border border-concrete-200 overflow-hidden lg:flex hover:shadow-lg transition-all duration-300">
                  {/* Visual side */}
                  <div className="lg:w-2/5 h-64 lg:h-auto bg-gradient-to-br from-charcoal-700 to-charcoal-600 flex items-center justify-center relative overflow-hidden">
                    {/* Decorative elements */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-6 left-6 right-6 bottom-6 border border-white/30 rounded-xl" />
                      <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
                      <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
                    </div>
                    <svg className="absolute bottom-0 left-0 right-0 w-full h-10 opacity-20" viewBox="0 0 400 40" fill="none" preserveAspectRatio="none">
                      <path d="M0,20 C100,35 200,5 300,22 C350,30 380,15 400,20" stroke="#A3B296" strokeWidth="1.5" fill="none" />
                    </svg>
                    <div className="text-center text-white relative z-10">
                      <p className="font-display text-5xl font-light mb-2">{rt.room_size_sqm}m²</p>
                      <p className="font-body text-xs tracking-wider uppercase text-white/50">{rt.bed_type} Bed</p>
                    </div>
                  </div>

                  {/* Info side */}
                  <div className="lg:w-3/5 p-8">
                    <h2 className="font-display text-2xl font-light text-charcoal-800 mb-3">{rt.name}</h2>
                    <p className="font-body text-sm text-charcoal-600 mb-4 leading-relaxed">{rt.description}</p>

                    <div className="flex gap-4 text-sm font-body text-concrete-600 mb-4">
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                        Maks. {rt.max_guests} Tamu
                      </span>
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 7.5l16.5-4.125M12 6.75c-2.708 0-5.363.224-7.948.655C2.999 7.58 2.25 8.507 2.25 9.574v9.176A2.25 2.25 0 004.5 21h15a2.25 2.25 0 002.25-2.25V9.574c0-1.067-.75-1.994-1.802-2.169A47.865 47.865 0 0012 6.75z" />
                        </svg>
                        {rt.bed_type} Bed
                      </span>
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                        </svg>
                        {rt.room_size_sqm}m²
                      </span>
                    </div>

                    {amenities.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-6">
                        {amenities.map((a: string) => (
                          <span
                            key={a}
                            className="px-3 py-1 bg-terracotta-50 text-terracotta-600 text-xs font-body rounded-full border border-terracotta-100"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Pricing */}
                    {rtRates.length > 0 && (
                      <div className="bg-concrete-100 rounded-xl p-5 mb-6">
                        <h4 className="font-body text-xs font-semibold tracking-wider uppercase text-charcoal-600 mb-4">Harga</h4>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          {rtRates.map((rate) => (
                            <div key={rate.id} className="bg-white rounded-lg p-3">
                              <p className="font-body text-[10px] tracking-wider uppercase text-concrete-600 mb-1.5">
                                {rate.stay_type === "daily" ? "Harian" : rate.stay_type === "weekly" ? "Mingguan" : "Bulanan"}
                              </p>
                              <p className="font-display text-lg font-light text-charcoal-800">
                                {formatCurrency(rate.price)}
                              </p>
                              <p className="font-body text-[10px] text-concrete-600">
                                {rate.stay_type === "daily" ? "/malam" : rate.stay_type === "weekly" ? "/minggu" : "/bulan"}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Link
                      href={`/booking?roomType=${rt.slug}`}
                      className="inline-flex items-center gap-2 bg-terracotta-500 text-white font-body font-semibold px-6 py-3 rounded-full text-sm hover:bg-terracotta-700 transition-all duration-300"
                    >
                      Booking {rt.name}
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Link>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
