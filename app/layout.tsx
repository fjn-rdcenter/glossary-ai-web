import type React from "react";
import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, Geist_Mono } from "next/font/google";
import { LanguageProvider } from "@/components/system/languageWrapper";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";
import localFont from "next/font/local";

const inter = localFont({
  src: "../fonts/Inter-VariableFont_opsz,wght.ttf",
  display: "swap",
  variable: "--font-inter",
});

const playfair = localFont({
  src: "../fonts/Playfair-VariableFont_opsz,wdth,wght.ttf",
  display: "swap",
  variable: "--font-playfair",
});

const geistMono = localFont({
  src: "../fonts/Geist-VariableFont_wght.ttf",
  display: "swap",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "TranslateSphere - Professional Translation Platform",
  description:
    "Premium document translation with custom glossaries and seamless workflow",
  generator: "v0.app",
};

export const viewport: Viewport = {
  themeColor: "#f5f3ef",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${playfair.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <LanguageProvider>
          {children}
          <Toaster />
        </LanguageProvider>
      </body>
    </html>
  );
}
