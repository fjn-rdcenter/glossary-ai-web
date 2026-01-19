import type React from "react";
import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/toaster";
import "../globals.css";
import localFont from 'next/font/local';
import {getMessages} from 'next-intl/server';
import { NextIntlClientProvider } from "next-intl";

const inter = localFont(
  {
    src: './fonts/Inter-VariableFont_opsz,wght.ttf',
    display: 'swap',
    variable: '--font-inter',
  }
)

const playfair = localFont(
  {
    src: './fonts/Playfair-VariableFont_opsz,wdth,wght.ttf',
    display: 'swap',
    variable: '--font-playfair',
  }
)

const geistMono = localFont(
  {
    src: './fonts/Geist-VariableFont_wght.ttf',
    display: 'swap',
    variable: '--font-geist-mono',
  }
)

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

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}>) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body suppressHydrationWarning
        className={`${inter.variable} ${playfair.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          {children}
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
