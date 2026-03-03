import type { Metadata } from "next";
import { Jost, Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";

const jost = Jost({
  subsets: ["latin"],
  variable: "--font-jost",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SADA Residence — Selalu Ada. Always Here.",
  description:
    "SADA Residence menyediakan hunian harian, mingguan & bulanan di kawasan Jimbaran, Bali. Warm, Simpel, Peaceful.",
  keywords: ["sada residence", "kos jimbaran", "apartemen bali", "booking kamar bali"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${jost.variable} ${jakarta.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
