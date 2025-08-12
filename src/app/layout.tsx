import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Card Collector Pro - Your Digital Card Collection",
  description: "Transform your physical trading cards into a stunning digital collection. Upload, organize, and showcase your cards with AI-powered recognition.",
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
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased" suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  );
}
