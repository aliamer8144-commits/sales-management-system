// Force rebuild
import type { Metadata, Viewport } from "next";
import { Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const notoSansArabic = Noto_Sans_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "نظام إدارة المبيعات",
  description: "نظام متكامل لإدارة المبيعات والمخزون والعملاء",
  keywords: ["مبيعات", "إدارة", "محاسبة", "مخزون", "عملاء"],
  authors: [{ name: "فريق التطوير" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0d9488",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${notoSansArabic.variable} font-sans antialiased bg-background text-foreground`}
        style={{ fontFamily: 'var(--font-arabic), system-ui, sans-serif' }}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
