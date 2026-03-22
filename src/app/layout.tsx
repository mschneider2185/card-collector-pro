import type { Metadata, Viewport } from "next";
import { Inter, DM_Serif_Display, JetBrains_Mono } from "next/font/google";
import AppNav from "@/components/AppNav";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-dm-serif",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "Card Collector Pro — Your Digital Card Collection",
  description: "Transform your physical trading cards into a precision digital collection. AI-powered recognition, real-time values, and intelligent organization.",
  keywords: "trading cards, card collection, sports cards, digital collection, AI card recognition",
  authors: [{ name: "Card Collector Pro" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${dmSerifDisplay.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased" suppressHydrationWarning={true}>
        <AppNav />
        {/* Offset content: right of sidebar on desktop, above bottom bar on mobile */}
        <div className="lg:pl-56 pb-16 lg:pb-0 min-h-screen" style={{ background: 'var(--color-bg)' }}>
          {children}
        </div>
      </body>
    </html>
  );
}
