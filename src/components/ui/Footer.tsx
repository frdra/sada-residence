import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-navy-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <h3 className="font-display text-2xl font-bold mb-3">
              Sada <span className="text-brand-400">Residence</span>
            </h3>
            <p className="text-gray-400 max-w-md">
              Akomodasi premium di kawasan Jimbaran, Bali. Tersedia kamar harian,
              mingguan, dan bulanan dengan fasilitas lengkap.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-brand-400">Navigasi</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><Link href="/" className="hover:text-white transition-colors">Beranda</Link></li>
              <li><Link href="/rooms" className="hover:text-white transition-colors">Tipe Kamar</Link></li>
              <li><Link href="/booking" className="hover:text-white transition-colors">Booking</Link></li>
              <li><Link href="/#location" className="hover:text-white transition-colors">Lokasi</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-brand-400">Kontak</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>Jl. Raya Jimbaran, Bali</li>
              <li>+62 812-3456-7890</li>
              <li>info@sadaresidence.com</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-navy-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Sada Residence. All rights reserved.
          </p>
          <Link href="/admin/login" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
