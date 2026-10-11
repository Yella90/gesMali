import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const serif4 = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif4",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GES Mali",
  description: "Gestion d'établissement scolaire",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={inter.variable + " " + serif4.variable}>
      <body className="antialiased bg-[var(--color-surface)] text-[var(--color-ink)]">
        {children}
      </body>
    </html>
  );
}