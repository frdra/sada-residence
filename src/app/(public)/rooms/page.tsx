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
  title: "Tipe Kamar — Sada Residence",
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
    <div className="py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h1 className="section-title mb-2">Tipe Kamar</h1>
          <p className="text-gray-600">
            Pilih tipe kamar yang sesuai dengan kebutuhan Anda di Sada Residence.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Link
            href="/rooms"
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              !params.type && !params.property
                ? "bg-navy-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Semua
          </Link>
          {roomTypes.map((rt) => (
            <Link
              key={rt.slug}
              href={`/rooms?type=${rt.slug}`}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                params.type === rt.slug
                  ? "bg-navy-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {rt.name}
            </Link>
          ))}
        </div>

        {/* Room type cards */}
        <div className="space-y-12">
          {roomTypes
            .filter((rt) => !params.type || rt.slug === params.type)
            .map((rt) => {
              const rtRates = rates.filter((r) => r.room_type_id === rt.id);
              const amenities: string[] = rt.amenities || [];

              return (
                <div key={rt.id} className="card lg:flex">
                  <div className="lg:w-2/5 h-64 lg:h-auto bg-gradient-to-br from-navy-800 to-navy-600 flex items-center justify-center">
                    <div className="text-center text-white">
                      <p className="text-5xl font-bold mb-2">{rt.room_size_sqm}m²</p>
                      <p className="text-sm opacity-70">{rt.bed_type} Bed</p>
                    </div>
                  </div>
                  <div className="lg:w-3/5 p-8">
                    <h2 className="font-display text-2xl font-bold mb-3">{rt.name}</h2>
                    <p className="text-gray-600 mb-4">{rt.description}</p>

                    <div className="flex gap-4 text-sm text-gray-500 mb-4">
                      <span>Maks. {rt.max_guests} Tamu</span>
                      <span>{rt.bed_type} Bed</span>
                      <span>{rt.room_size_sqm}m²</span>
                    </div>

                    {amenities.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-6">
                        {amenities.map((a: string) => (
                          <span
                            key={a}
                            className="px-3 py-1 bg-brand-50 text-brand-700 text-xs rounded-full"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Pricing table */}
                    {rtRates.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <h4 className="font-semibold text-sm mb-3">Harga</h4>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          {rtRates.map((rate) => (
                            <div key={rate.id}>
                              <p className="text-xs text-gray-500 capitalize mb-1">
                                {rate.stay_type === "daily"
                                  ? "Harian"
                                  : rate.stay_type === "weekly"
                                  ? "Mingguan"
                                  : "Bulanan"}
                              </p>
                              <p className="font-bold text-navy-900">
                                {formatCurrency(rate.price)}
                              </p>
                              <p className="text-xs text-gray-400">
                                {rate.stay_type === "daily"
                                  ? "/malam"
                                  : rate.stay_type === "weekly"
                                  ? "/minggu"
                                  : "/bulan"}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Link
                      href={`/booking?roomType=${rt.slug}`}
                      className="btn-primary inline-block text-sm"
                    >
                      Booking {rt.name}
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
