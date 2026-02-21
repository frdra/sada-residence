import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sada Residence — Akomodasi Premium di Jimbaran, Bali",
  description:
    "Sada Residence menyediakan kamar harian, mingguan & bulanan di kawasan Jimbaran, Bali. Fasilitas lengkap, lokasi strategis, harga terjangkau.",
  keywords: ["sada residence", "kos jimbaran", "apartemen bali", "booking kamar bali"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${inter.variable} ${playfair.variable}`}>
      <body>{children}</body>
    </html>
  );
}
