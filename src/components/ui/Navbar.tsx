"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  // Only the homepage has a dark hero — all other pages need solid navbar immediately
  const isHomepage = pathname === "/";
  const showSolid = !isHomepage || scrolled;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        showSolid
          ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-concrete-200"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            {/* Logo mark - simplified */}
            <div className="relative w-10 h-10">
              <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <circle cx="20" cy="20" r="18.5" stroke={showSolid ? "#A0695A" : "#C4907F"} strokeWidth="1" />
                <rect x="14" y="10" width="12" height="16" rx="0.5" fill="none" stroke={showSolid ? "#2C2C2C" : "#E8E4DE"} strokeWidth="1" />
                <rect x="17.5" y="7.5" width="5" height="3.5" rx="0.5" fill={showSolid ? "#A0695A" : "#C4907F"} />
                <rect x="10" y="16" width="20" height="0.8" rx="0.4" fill={showSolid ? "#A0695A" : "#C4907F"} opacity="0.7" />
                <rect x="10" y="21" width="20" height="0.8" rx="0.4" fill={showSolid ? "#A0695A" : "#C4907F"} opacity="0.7" />
                <path d="M8,30 C13,27 18,32 23,29 C27,27 30,30 33,29" stroke={showSolid ? "#7A8B6F" : "#A3B296"} strokeWidth="1" fill="none" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <span className={`font-display text-xl font-light tracking-[0.3em] transition-colors duration-500 ${showSolid ? "text-charcoal-800" : "text-concrete-200"}`}>
                SADA
              </span>
              <span className={`block font-body text-[9px] font-normal tracking-[0.35em] transition-colors duration-500 ${showSolid ? "text-terracotta-500" : "text-terracotta-400"}`}>
                RESIDENCE
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {[
              { href: "/#properties", label: "Properti" },
              { href: "/rooms", label: "Kamar" },
              { href: "/#features", label: "Fasilitas" },
              { href: "/#location", label: "Lokasi" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-body font-medium transition-colors duration-300 relative group ${
                  showSolid ? "text-charcoal-600 hover:text-charcoal-800" : "text-white/70 hover:text-white"
                }`}
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-[1.5px] bg-terracotta-400 transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
            <Link
              href="/booking"
              className={`font-body font-semibold text-sm px-5 py-2.5 rounded-full transition-all duration-300 ${
                showSolid
                  ? "bg-terracotta-500 text-white hover:bg-terracotta-700 shadow-sm"
                  : "bg-white/10 text-white border border-white/30 hover:bg-white/20 backdrop-blur-sm"
              }`}
            >
              Booking Sekarang
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`md:hidden p-2.5 rounded-xl transition-colors ${showSolid ? "text-charcoal-600" : "text-white/80"}`}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden transition-all duration-300 overflow-hidden ${
          isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-white/95 backdrop-blur-md border-t border-concrete-200 px-6 py-6 space-y-1">
          {[
            { href: "/#properties", label: "Properti" },
            { href: "/rooms", label: "Kamar" },
            { href: "/#features", label: "Fasilitas" },
            { href: "/#location", label: "Lokasi" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block py-3 text-charcoal-600 hover:text-terracotta-500 font-body transition-colors border-b border-concrete-100 last:border-0"
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/booking"
            className="block mt-4 text-center bg-terracotta-500 text-white font-semibold py-3 rounded-xl hover:bg-terracotta-700 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            Booking Sekarang
          </Link>
        </div>
      </div>
    </nav>
  );
}
