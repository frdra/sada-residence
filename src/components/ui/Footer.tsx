import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-charcoal-800 text-white relative overflow-hidden">
      {/* Decorative wave at top */}
      <div className="absolute top-0 left-0 right-0">
        <svg viewBox="0 0 1440 60" fill="none" className="w-full h-auto" preserveAspectRatio="none">
          <path
            d="M0,60 L0,20 C240,50 480,0 720,25 C960,50 1200,0 1440,20 L1440,60 Z"
            fill="#2C2C2C"
          />
          <path
            d="M0,20 C240,50 480,0 720,25 C960,50 1200,0 1440,20"
            stroke="#A0695A"
            strokeWidth="1.5"
            fill="none"
            opacity="0.3"
          />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 relative z-10">
        <div className="grid md:grid-cols-12 gap-12 mb-16">
          {/* Brand */}
          <div className="md:col-span-5">
            <div className="flex items-center gap-3 mb-6">
              <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="22" cy="22" r="20.5" stroke="#C4907F" strokeWidth="1" />
                <rect x="15" y="10" width="14" height="17" rx="0.5" fill="none" stroke="#E8E4DE" strokeWidth="1" />
                <rect x="19" y="7" width="6" height="4" rx="0.5" fill="#C4907F" />
                <rect x="11" y="17" width="22" height="0.8" rx="0.4" fill="#C4907F" opacity="0.7" />
                <rect x="11" y="22" width="22" height="0.8" rx="0.4" fill="#C4907F" opacity="0.7" />
                <path d="M9,32 C15,28 21,34 27,30 C31,28 34,32 37,30" stroke="#A3B296" strokeWidth="1.2" fill="none" strokeLinecap="round" />
              </svg>
              <div>
                <span className="font-display text-2xl font-light tracking-[0.3em] text-concrete-200">SADA</span>
                <span className="block font-body text-[9px] font-normal tracking-[0.35em] text-terracotta-400">RESIDENCE</span>
              </div>
            </div>
            <p className="text-concrete-600 font-body text-sm leading-relaxed max-w-sm mb-6">
              Satu hunian yang abadi — hangat dalam karakter, simpel dalam desain,
              dan penuh kedamaian dalam setiap sudutnya.
            </p>
            <p className="font-display text-lg font-light italic text-terracotta-400/60 tracking-wider">
              Selalu Ada. <span className="text-concrete-600/40">Always Here.</span>
            </p>
          </div>

          {/* Navigation */}
          <div className="md:col-span-2">
            <h4 className="font-body text-[10px] font-semibold tracking-[0.2em] uppercase text-terracotta-400 mb-5">
              Navigasi
            </h4>
            <ul className="space-y-3 text-sm font-body">
              <li><Link href="/" className="text-concrete-600 hover:text-concrete-200 transition-colors duration-300">Beranda</Link></li>
              <li><Link href="/rooms" className="text-concrete-600 hover:text-concrete-200 transition-colors duration-300">Kamar</Link></li>
              <li><Link href="/booking" className="text-concrete-600 hover:text-concrete-200 transition-colors duration-300">Booking</Link></li>
              <li><Link href="/#location" className="text-concrete-600 hover:text-concrete-200 transition-colors duration-300">Lokasi</Link></li>
            </ul>
          </div>

          {/* Properties */}
          <div className="md:col-span-2">
            <h4 className="font-body text-[10px] font-semibold tracking-[0.2em] uppercase text-terracotta-400 mb-5">
              Properti
            </h4>
            <ul className="space-y-3 text-sm font-body">
              <li><Link href="/rooms?property=persada" className="text-concrete-600 hover:text-concrete-200 transition-colors duration-300">Persada</Link></li>
              <li><Link href="/rooms?property=udayana" className="text-concrete-600 hover:text-concrete-200 transition-colors duration-300">Udayana</Link></li>
              <li><Link href="/rooms?property=taman-griya" className="text-concrete-600 hover:text-concrete-200 transition-colors duration-300">Taman Griya</Link></li>
              <li><Link href="/rooms?property=goa-gong" className="text-concrete-600 hover:text-concrete-200 transition-colors duration-300">Goa Gong</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="md:col-span-3">
            <h4 className="font-body text-[10px] font-semibold tracking-[0.2em] uppercase text-terracotta-400 mb-5">
              Hubungi Kami
            </h4>
            <ul className="space-y-3 text-sm font-body text-concrete-600">
              <li className="flex items-start gap-2.5">
                <svg className="w-4 h-4 mt-0.5 text-terracotta-400/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                Jl. Raya Jimbaran, Kuta Selatan, Badung, Bali
              </li>
              <li className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-terracotta-400/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
                +62 812-3456-7890
              </li>
              <li className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-terracotta-400/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                info@sadaresidence.com
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-charcoal-700/50 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <p className="font-body text-xs text-concrete-600/60">
              &copy; {new Date().getFullYear()} SADA Residence. All rights reserved.
            </p>
          </div>
          <div className="flex items-center gap-6">
            {/* Values */}
            <div className="flex items-center gap-4">
              {["Siap Huni", "Fleksibel", "Terpercaya"].map((pillar, i) => (
                <span key={pillar} className="font-body text-[9px] tracking-[0.2em] uppercase text-concrete-600/30">
                  {i > 0 && <span className="mr-4 text-terracotta-400/20">·</span>}
                  {pillar}
                </span>
              ))}
            </div>
            <Link
              href="/admin/login"
              className="font-body text-[10px] text-concrete-600/30 hover:text-concrete-600/60 transition-colors"
            >
              Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
