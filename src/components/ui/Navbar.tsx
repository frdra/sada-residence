"use client";

import { useState } from "react";
import Link from "next/link";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-display text-xl font-bold text-navy-900">
              Sada <span className="text-brand-400">Residence</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/#properties" className="text-sm text-gray-600 hover:text-navy-900 transition-colors">
              Properti
            </Link>
            <Link href="/rooms" className="text-sm text-gray-600 hover:text-navy-900 transition-colors">
              Tipe Kamar
            </Link>
            <Link href="/#features" className="text-sm text-gray-600 hover:text-navy-900 transition-colors">
              Fasilitas
            </Link>
            <Link href="/#location" className="text-sm text-gray-600 hover:text-navy-900 transition-colors">
              Lokasi
            </Link>
            <Link href="/booking" className="btn-primary text-sm !py-2 !px-4">
              Booking Sekarang
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-gray-600"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
          <Link href="/#properties" className="block text-gray-600 hover:text-navy-900" onClick={() => setIsOpen(false)}>Properti</Link>
          <Link href="/rooms" className="block text-gray-600 hover:text-navy-900" onClick={() => setIsOpen(false)}>Tipe Kamar</Link>
          <Link href="/#features" className="block text-gray-600 hover:text-navy-900" onClick={() => setIsOpen(false)}>Fasilitas</Link>
          <Link href="/#location" className="block text-gray-600 hover:text-navy-900" onClick={() => setIsOpen(false)}>Lokasi</Link>
          <Link href="/booking" className="block btn-primary text-center text-sm" onClick={() => setIsOpen(false)}>Booking Sekarang</Link>
        </div>
      )}
    </nav>
  );
}
