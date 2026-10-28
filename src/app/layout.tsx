import type { Metadata, Viewport } from "next";
import { Heebo, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-heebo",
});

export const metadata: Metadata = {
  title: "ניהול הוצאות",
  description: "ניהול הוצאות הבית",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#84C441",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl" className={`${inter.variable} ${heebo.variable}`}>
      <body>{children}</body>
    </html>
  );
}
